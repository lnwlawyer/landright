/**
 * Firebase Secure Token verification for Cloudflare Workers (Web Crypto).
 * A trusted revocation checker is mandatory: no callback means fail closed.
 * Public keys are fetched from Google's fixed Firebase Secure Token JWKS URL.
 */
const JWKS_URL='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const ISSUER='https://securetoken.google.com/landright-admin';
const PROJECT='landright-admin';
const decoder=new TextDecoder();
function decode64url(value){
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Malformed JWT');
  const base=value.replace(/-/g,'+').replace(/_/g,'/');
  const bytes=Uint8Array.from(atob(base.padEnd(Math.ceil(base.length/4)*4,'=')),c=>c.charCodeAt(0));
  return bytes;
}
function parsePart(value){return JSON.parse(decoder.decode(decode64url(value)));}
export function createWorkersFirebaseAuth({fetchImpl=fetch,checkRevoked,now=()=>Date.now()}={}){
  if(typeof checkRevoked!=='function')throw new TypeError('Trusted revocation checker required');
  let cached=null,expiresAt=0;
  async function keys(){
    if(cached&&now()<expiresAt)return cached;
    const response=await fetchImpl(JWKS_URL,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Google JWKS unavailable');
    const body=await response.json();
    if(!Array.isArray(body.keys)||body.keys.length<1||body.keys.length>20)throw Error('Invalid Google JWKS');
    const maxAge=/max-age=(\d+)/i.exec(response.headers.get('cache-control')||'');
    cached=body.keys;expiresAt=now()+Math.min(Number(maxAge?.[1]||300),3600)*1000;
    return cached;
  }
  return {async verifyIdToken(token,verifyRevoked){
    let phase='token_parse';
    try {
    if(verifyRevoked!==true)throw Error('Revocation verification required');
    if(typeof token!=='string'||token.length>16384)throw Error('Invalid token');
    const parts=token.split('.');
    if(parts.length!==3)throw Error('Invalid JWT');
    const header=parsePart(parts[0]),payload=parsePart(parts[1]);
    if(header.alg!=='RS256'||header.typ&&header.typ!=='JWT'||typeof header.kid!=='string'||!header.kid)throw Error('Invalid JWT header');
    phase='jwks_fetch';
    const key=(await keys()).find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
    if(!key)throw Error('Unknown signing key');
    phase='signature_crypto';
    const publicKey=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,decode64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
    if(!valid)throw Error('Invalid signature');
    phase='claims_check';
    const seconds=Math.floor(now()/1000);
    if(payload.aud!==PROJECT||payload.iss!==ISSUER||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||
      !Number.isInteger(payload.exp)||payload.exp<=seconds||!Number.isInteger(payload.iat)||payload.iat>seconds||
      !Number.isInteger(payload.auth_time)||payload.auth_time>seconds||payload.iat<=0)throw Error('Invalid Firebase claims');
    phase='revocation_lookup';
    const revoked=await checkRevoked(payload.sub,payload);
    if(revoked!==false)throw Error('Revoked or unverified Firebase user');
    return {...payload,uid:payload.sub};
    } catch (error) {
      const known=new Map([
        ['Revocation verification required','revocation_required'],
        ['Invalid token','token_shape'],['Invalid JWT','jwt_shape'],['Malformed JWT','jwt_shape'],
        ['Invalid JWT header','jwt_header'],['Google JWKS unavailable','jwks_unavailable'],
        ['Invalid Google JWKS','jwks_invalid'],['Unknown signing key','jwks_key_missing'],
        ['Invalid signature','signature_invalid'],['Invalid Firebase claims','claims_invalid'],
        ['Revoked or unverified Firebase user','revocation_denied'],
        ['User not active','firebase_user_inactive'],
        ['Cannot verify token revocation','revocation_indeterminate']
      ]);
      const stage=error?.code==='FIREBASE_AUTH_UPSTREAM_UNAVAILABLE'?'auth_upstream_unavailable':known.get(error?.message)||('exception_at_'+phase);
      console.warn('landright_admin_firebase_token_verification_failed',{stage});
      throw error;
    }
  }};
}
