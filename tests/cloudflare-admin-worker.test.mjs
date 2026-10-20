import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudflareAdminWorker} from '../admin/cloudflare-worker.mjs';
const endpoint='https://admin.example.workers.dev/api/admin/me';
const req=(method='GET',headers={})=>new Request(endpoint,{method,headers});
const claims={uid:'uid-1',aud:'landright-admin',iss:'https://securetoken.google.com/landright-admin',firebase:{sign_in_provider:'google.com'}};
const auth={verifyIdToken:async(_token,revoked)=>{assert.equal(revoked,true);return claims;}};
const admin=()=>createCloudflareAdminWorker({firebaseAuth:auth,getAdminRole:async()=>({role:'admin',is_active:true})});
test('unconfigured Worker fails closed, never grants Admin',async()=>{
 const response=await createCloudflareAdminWorker().fetch(req('GET',{Origin:'https://lnwlawyer.github.io',Authorization:'Bearer '+'a'.repeat(30)}));
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{error:'admin_backend_not_configured'});
});
test('authorized token and server role can use existing endpoint',async()=>{
 const response=await admin().fetch(req('GET',{Origin:'https://lnwlawyer.github.io',Authorization:'Bearer '+'a'.repeat(30)}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{uid:'uid-1',role:'admin'});
});
test('unauthorized and disabled role are denied',async()=>{
 assert.equal((await admin().fetch(req())).status,401);
 const worker=createCloudflareAdminWorker({firebaseAuth:auth,getAdminRole:async()=>({role:'admin',is_active:false})});
 assert.equal((await worker.fetch(req('GET',{Authorization:'Bearer '+'a'.repeat(30)}))).status,403);
});
test('CORS denies foreign origins and allows only configured origin',async()=>{
 assert.equal((await admin().fetch(req('GET',{Origin:'https://evil.example'}))).status,403);
 const response=await admin().fetch(req('OPTIONS',{Origin:'https://lnwlawyer.github.io'}));
 assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),'https://lnwlawyer.github.io');
});
test('unknown routes and non-GET methods are rejected',async()=>{
 assert.equal((await admin().fetch(new Request('https://admin.example.workers.dev/other'))).status,404);
 assert.equal((await admin().fetch(req('POST'))).status,405);
});
test('role store failure never grants access',async()=>{
 const worker=createCloudflareAdminWorker({firebaseAuth:auth,getAdminRole:async()=>{throw Error('offline');}});
 assert.equal((await worker.fetch(req('GET',{Authorization:'Bearer '+'a'.repeat(30)}))).status,503);
});
