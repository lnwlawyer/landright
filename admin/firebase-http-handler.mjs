import {authorizeFirebaseAdmin} from './firebase-auth-gate.mjs';

/**
 * Server-only, framework-neutral read-only Admin identity endpoint.
 * An HTTPS adapter must supply verified Firebase Admin SDK auth and a
 * server-owned Firestore role lookup. Do not deploy on GitHub Pages.
 */
export function createFirebaseAdminHttpHandler({firebaseAuth,getAdminRole}) {
  return async function handle({method,path,headers}={}) {
    const response=(status,body)=>({status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},body});
    if (path !== '/api/admin/me') return response(404,{error:'not_found'});
    if (method !== 'GET') return response(405,{error:'method_not_allowed'});
    const authorization=headers?.authorization ?? headers?.Authorization;
    const result=await authorizeFirebaseAdmin({authorization,firebaseAuth,getAdminRole});
    if (!result.ok) return response(result.status,{error:result.reason});
    return response(200,{uid:result.uid,role:'admin'});
  };
}
