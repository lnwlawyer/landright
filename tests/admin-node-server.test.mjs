import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminServer} from '../admin/node-server.mjs';
const claims={uid:'uid1',aud:'landright-admin',iss:'https://securetoken.google.com/landright-admin',firebase:{sign_in_provider:'google.com'}};
const origin='https://lnwlawyer.github.io';
async function setup(role={role:'admin',is_active:true}){
 const server=await createAdminServer({firebaseAuth:{verifyIdToken:async()=>claims},getAdminRole:async()=>role,allowedOrigin:origin});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,url:'http://127.0.0.1:'+server.address().port+'/api/admin/me'};
}
test('authorized Firebase admin returns identity',async t=>{
 const {server,url}=await setup();t.after(()=>server.close());
 const r=await fetch(url,{headers:{origin,authorization:'Bearer '+'x'.repeat(24)}});
 assert.equal(r.status,200);assert.equal((await r.json()).role,'admin');assert.equal(r.headers.get('access-control-allow-origin'),origin);
});
test('anonymous request rejected',async t=>{const {server,url}=await setup();t.after(()=>server.close());assert.equal((await fetch(url)).status,401);});
test('user role rejected',async t=>{const {server,url}=await setup({role:'user',is_active:true});t.after(()=>server.close());assert.equal((await fetch(url,{headers:{authorization:'Bearer '+'x'.repeat(24)}})).status,403);});
test('cross-origin request rejected',async t=>{const {server,url}=await setup();t.after(()=>server.close());assert.equal((await fetch(url,{headers:{origin:'https://example.org'}})).status,403);});
test('writes not exposed',async t=>{const {server,url}=await setup();t.after(()=>server.close());assert.equal((await fetch(url,{method:'POST'})).status,405);});
test('valid preflight restricted',async t=>{const {server,url}=await setup();t.after(()=>server.close());const r=await fetch(url,{method:'OPTIONS',headers:{origin,'access-control-request-method':'GET'}});assert.equal(r.status,204);});
