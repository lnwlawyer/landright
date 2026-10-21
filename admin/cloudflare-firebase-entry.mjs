import {createWorkersFirebaseAuth} from './workers-firebase-auth.mjs';
import {createCloudflareAdminWorker} from './cloudflare-worker.mjs';

const PROJECT='landright-admin';
const TOKEN_URL='https://oauth2.googleapis.com/token';
const SCOPE='https://www.googleapis.com/auth/cloud-platform';
const encoder=new TextEncoder();
const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const jsonResponse=async(response)=>{
  if(!response.ok)throw Error('Trusted Google API request failed');
  return response.json();
};
const post=async(url,body,accessToken,fetchImpl)=>{
  return jsonResponse(await fetchImpl(url,{method:'POST',headers:{
    'content-type':'application/json',...(accessToken?{authorization:'Bearer '+accessToken}:{})
  },body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(8000)}));
};

/**
 * Trusted Google REST reader for Cloudflare Workers.
 * Credential is an encrypted Worker secret, never a browser config or GitHub file.
 */
export function createWorkersFirebaseServices({serviceAccountJson,googleAccessToken,fetchImpl=fetch,now=()=>Date.now()}={}){
  if(googleAccessToken!==undefined&&typeof googleAccessToken!=='function')throw Error('Invalid Google token provider');
  if(googleAccessToken&&serviceAccountJson)throw Error('Ambiguous Google credential configuration');
  if(!googleAccessToken&&(typeof serviceAccountJson!=='string'||!serviceAccountJson))throw Error('Missing Worker credential secret');
  const credentials=googleAccessToken?null:JSON.parse(serviceAccountJson);
  if(credentials&&(credentials.type!=='service_account'||credentials.project_id!==PROJECT||
    !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.gserviceaccount\.com$/.test(credentials.client_email||'')||
    typeof credentials.private_key!=='string'||!credentials.private_key.includes('BEGIN PRIVATE KEY')))
    throw Error('Invalid Firebase service identity');
  let accessToken='',expiresAt=0;
  async function serviceAccountToken(){
    if(accessToken&&now()+60000<expiresAt)return accessToken;
    const seconds=Math.floor(now()/1000);
    const header=b64url(encoder.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
    const payload=b64url(encoder.encode(JSON.stringify({
      iss:credentials.client_email,scope:SCOPE,aud:TOKEN_URL,iat:seconds,exp:seconds+3600
    })));
    const pem=credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
    const raw=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
    const key=await crypto.subtle.importKey('pkcs8',raw,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(header+'.'+payload));
    const assertion=header+'.'+payload+'.'+b64url(signature);
    const body=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion});
    const response=await fetchImpl(TOKEN_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
      body:body.toString(),redirect:'error',signal:AbortSignal.timeout(8000)});
    const data=await jsonResponse(response);
    if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in)||data.expires_in<=0)
      throw Error('Invalid Google OAuth response');
    accessToken=data.access_token;expiresAt=now()+Math.min(data.expires_in,3600)*1000;
    return accessToken;
  }
  const googleToken=googleAccessToken||serviceAccountToken;
  async function checkRevoked(uid,claims){
    if(!/^[^/]{1,128}$/.test(uid))throw Error('Invalid uid');
    let data;
    try { data=await post('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+'/accounts:lookup',
      {localId:[uid]},await googleToken(),fetchImpl); }
    catch { const error=new Error('Trusted Firebase Auth upstream unavailable');error.code='FIREBASE_AUTH_UPSTREAM_UNAVAILABLE';throw error; }
    const user=Array.isArray(data.users)&&data.users.length===1?data.users[0]:null;
    if(!user||user.localId!==uid||user.disabled===true)throw Error('User not active');
    const validSince=Number(user.validSince);
    if(!Number.isFinite(validSince)||validSince<0||!Number.isInteger(claims.auth_time))
      throw Error('Cannot verify token revocation');
    return claims.auth_time<validSince;
  }
  async function getAdminRole(uid){
    if(!/^[^/]{1,128}$/.test(uid))throw Error('Invalid uid');
    const path='https://firestore.googleapis.com/v1/projects/'+PROJECT+
      '/databases/(default)/documents/landrightAdminRoles/'+encodeURIComponent(uid);
    const response=await fetchImpl(path,{headers:{authorization:'Bearer '+await googleToken()},
      redirect:'error',signal:AbortSignal.timeout(8000)});
    if(response.status===404)return null;
    const data=await jsonResponse(response);
    return {role:data.fields?.role?.stringValue,is_active:data.fields?.is_active?.booleanValue===true};
  }
  return {firebaseAuth:createWorkersFirebaseAuth({fetchImpl,checkRevoked,now}),getAdminRole};
}

export default {
  async fetch(request,env){
    // Missing credentials always fails closed via the existing Worker adapter.
    if(!env?.FIREBASE_SERVICE_ACCOUNT_JSON)return createCloudflareAdminWorker().fetch(request);
    try{
      const services=createWorkersFirebaseServices({serviceAccountJson:env.FIREBASE_SERVICE_ACCOUNT_JSON});
      return createCloudflareAdminWorker(services).fetch(request);
    }catch{return createCloudflareAdminWorker().fetch(request);}
  }
};
