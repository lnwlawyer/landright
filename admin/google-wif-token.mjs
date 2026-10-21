// Optional keyless Google Cloud token source. This module does not mint identities.
// A trusted external OIDC identity provider must issue the assertion at runtime.
const DEFAULT_STS='https://sts.googleapis.com/v1/token';
export function createGoogleWifTokenSource({audience,getSubjectToken,fetchImpl=fetch,now=()=>Date.now(),stsUrl=DEFAULT_STS}={}){
  if(typeof audience!=='string'||!/^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/.test(audience))
    throw Error('Invalid WIF audience');
  if(typeof getSubjectToken!=='function')throw Error('Trusted OIDC token provider required');
  if(stsUrl!==DEFAULT_STS)throw Error('Untrusted STS endpoint');
  let cached='',expiry=0;
  return async function googleToken(){
    if(cached&&now()+60000<expiry)return cached;
    const assertion=await getSubjectToken();
    if(typeof assertion!=='string'||assertion.length<20||assertion.length>16384)
      throw Error('Invalid OIDC subject token');
    const body={
      audience,grantType:'urn:ietf:params:oauth:grant-type:token-exchange',
      requestedTokenType:'urn:ietf:params:oauth:token-type:access_token',
      subjectTokenType:'urn:ietf:params:oauth:token-type:jwt',
      subjectToken:assertion,scope:'https://www.googleapis.com/auth/cloud-platform'
    };
    const response=await fetchImpl(stsUrl,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Google STS exchange failed');
    const data=await response.json();
    if(typeof data.access_token!=='string'||!Number.isFinite(Number(data.expires_in))||
      Number(data.expires_in)<=0||data.token_type!=='Bearer')
      throw Error('Invalid Google STS token response');
    cached=data.access_token;expiry=now()+Math.min(Number(data.expires_in),3600)*1000;
    return cached;
  };
}
