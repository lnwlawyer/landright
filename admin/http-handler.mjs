import {authorizeGoogleAdminRequest} from './server-auth-gate.mjs';
import {changeUserRole} from './role-mutation-service.mjs';

/**
 * Framework-neutral, server-only request handler. Mount behind HTTPS in a
 * separately approved backend; NEVER serve as a GitHub Pages script.
 * Auth tokens are accepted exclusively in Authorization: Bearer.
 */
const BEARER=/^Bearer ([A-Za-z0-9._-]{20,16384})$/;
const SUBJECT=/^google:[0-9]{3,64}$/;
const CORRELATION=/^[A-Za-z0-9_-]{8,128}$/;
const response=(status,body)=>({status,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'},body});
export function createAdminHttpHandler({clientId,getJwks,roleStore,now=()=>Date.now()}={}) {
 if (!clientId || typeof getJwks!=='function'
   || typeof roleStore?.getBySubject!=='function'
   || typeof roleStore?.transactRoleChange!=='function') throw Error('Server dependencies required');
 return async function handle({method,path,headers={},body}={}) {
   if (typeof path!=='string' || !['GET','POST'].includes(method)) return response(404,{error:'not-found'});
   if (path!=='/api/admin/me' && path!=='/api/admin/roles/change') return response(404,{error:'not-found'});
   if ((path==='/api/admin/me' && method!=='GET') || (path==='/api/admin/roles/change' && method!=='POST'))
     return response(405,{error:'method-not-allowed'});
   const token=BEARER.exec(headers.authorization??'')?.[1];
   if (!token) return response(401,{error:'unauthorized'});
   try {
     const action=path==='/api/admin/me'?'settings.read':'users.role.update';
     const auth=await authorizeGoogleAdminRequest({idToken:token,action,clientId,getJwks,roleStore,now:now()});
     if (!auth.allowed) return response(403,{error:'forbidden'});
     if (method==='GET') return response(200,{subject:auth.principal.subject,role:'admin'});
     // Strict allowlist: never accept actor, roleStore or privileges from JSON.
     if (!body || typeof body!=='object' || Array.isArray(body)
       || Object.keys(body).some(k=>!['targetSubject','newRole','confirmation','expectedVersion','correlationId'].includes(k))
       || !SUBJECT.test(body.targetSubject) || !['user','admin'].includes(body.newRole)
       || !CORRELATION.test(body.correlationId)) return response(400,{error:'invalid-request'});
     const result=await changeUserRole({
       actor:auth.principal,targetSubject:body.targetSubject,newRole:body.newRole,
       confirmation:body.confirmation,expectedVersion:body.expectedVersion,
       correlationId:body.correlationId,roleStore
     });
     if (!result.ok) return response(result.reason==='version-conflict'?409:400,{error:result.reason});
     return response(200,{subject:result.subject,version:result.version});
   } catch (error) {
     // Verification errors are deliberately indistinguishable to callers.
     if (error?.message==='Invalid Google ID token') return response(401,{error:'unauthorized'});
     return response(503,{error:'service-unavailable'});
   }
 };
}
