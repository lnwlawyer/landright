import http from 'node:http';
import {createFirebaseAdminHttpHandler} from './firebase-http-handler.mjs';

/**
 * Trusted server adapter. Never run this on GitHub Pages.
 * Runtime dependencies are loaded only when the server starts.
 */
export async function createAdminServer({firebaseAuth,getAdminRole,allowedOrigin}) {
  if (!allowedOrigin || !/^https:\/\/[^/]+$/.test(allowedOrigin)) throw Error('Explicit HTTPS allowedOrigin required');
  const handle=createFirebaseAdminHttpHandler({firebaseAuth,getAdminRole});
  return http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    const send=(status,body,extra={})=>{
      res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin',...extra});
      res.end(JSON.stringify(body));
    };
    if(origin && origin!==allowedOrigin) return send(403,{error:'origin_not_allowed'});
    const cors=origin===allowedOrigin?{'access-control-allow-origin':allowedOrigin}:{};
    if(req.method==='OPTIONS') {
      if(origin!==allowedOrigin) return send(403,{error:'origin_not_allowed'});
      if(req.url!=='/api/admin/me') return send(404,{error:'not_found'},cors);
      return send(204,undefined,{...cors,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Authorization'});
    }
    if(req.url!=='/api/admin/me') return send(404,{error:'not_found'},cors);
    if(req.method!=='GET') return send(405,{error:'method_not_allowed'},cors);
    try {
      const result=await handle({method:req.method,path:req.url,headers:req.headers});
      return send(result.status,result.body,cors);
    } catch {
      return send(503,{error:'service_unavailable'},cors);
    }
  });
}

export async function startAdminServer({port=8080,allowedOrigin='https://lnwlawyer.github.io'}={}) {
  const [{initializeApp,applicationDefault},{getAuth},{getFirestore}]=await Promise.all([
    import('firebase-admin/app'),import('firebase-admin/auth'),import('firebase-admin/firestore')
  ]);
  const app=initializeApp({credential:applicationDefault(),projectId:'landright-admin'});
  const db=getFirestore(app);
  const server=await createAdminServer({
    firebaseAuth:getAuth(app),
    getAdminRole:async(uid)=>{
      const snapshot=await db.collection('landrightAdminRoles').doc(uid).get();
      return snapshot.exists?snapshot.data():null;
    },
    allowedOrigin
  });
  return new Promise((resolve,reject)=>server.once('error',reject).listen(port,'127.0.0.1',()=>resolve(server)));
}
