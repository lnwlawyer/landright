import {createFirebaseAdminHttpHandler} from './firebase-http-handler.mjs';

/**
 * Cloudflare Workers HTTP adapter for the existing Firebase Admin boundary.
 * The trusted Firebase ID-token verifier and server-owned role reader must
 * be supplied by a reviewed, Workers-compatible credential integration.
 * Never trust client claims or grant admin access on missing bindings.
 */
export function createCloudflareAdminWorker({firebaseAuth,getAdminRole,allowedOrigin='https://lnwlawyer.github.io'}={}) {
  if(!/^https:\/\/[^/]+$/.test(allowedOrigin))throw new TypeError('Explicit HTTPS origin required');
  const ready=typeof firebaseAuth?.verifyIdToken==='function'&&typeof getAdminRole==='function';
  const handler=ready?createFirebaseAdminHttpHandler({firebaseAuth,getAdminRole}):null;
  const json=(status,body,extra={})=>new Response(status===204?null:JSON.stringify(body),{
    status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
      'x-content-type-options':'nosniff','vary':'Origin',...extra}});
  return {async fetch(request){
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(url.protocol!=='https:')return json(403,{error:'https_required'});
    if(origin&&origin!==allowedOrigin)return json(403,{error:'origin_not_allowed'});
    const cors=origin===allowedOrigin?{'access-control-allow-origin':allowedOrigin}:{};
    if(url.pathname!=='/api/admin/me')return json(404,{error:'not_found'},cors);
    if(request.method==='OPTIONS'){
      if(origin!==allowedOrigin)return json(403,{error:'origin_not_allowed'});
      return json(204,null,{...cors,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Authorization'});
    }
    if(request.method!=='GET')return json(405,{error:'method_not_allowed'},cors);
    if(!handler)return json(503,{error:'admin_backend_not_configured'},cors);
    try{
      const result=await handler({method:'GET',path:url.pathname,headers:{authorization:request.headers.get('Authorization')}});
      return json(result.status,result.body,cors);
    }catch{return json(503,{error:'service_unavailable'},cors);}
  }};
}

// Safe entrypoint: until a trusted Workers-compatible credential provider is
// installed, this Worker always returns 503 rather than bypassing authorization.
export default createCloudflareAdminWorker();
