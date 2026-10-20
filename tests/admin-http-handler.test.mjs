import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createAdminHttpHandler} from '../admin/http-handler.mjs';

const clientId='123456789-abc.apps.googleusercontent.com';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});
const getJwks=async()=>({keys:[{...jwk,kid:'test-key',alg:'RS256',use:'sig'}]});
const now=Date.parse('2026-10-20T12:00:00Z');
function token(sub='123456789012') {
 const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const data=encode({alg:'RS256',typ:'JWT',kid:'test-key'})+'.'+encode({
   iss:'https://accounts.google.com',aud:clientId,sub,
   iat:Math.floor(now/1000)-60,exp:Math.floor(now/1000)+600
 });
 return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');
}
const admin={subject:'google:123456789012',role:'admin',disabled:false,version:0};
const user={subject:'google:222222222222',role:'user',disabled:false,version:0};
function store(){
 const roles=new Map([[admin.subject,{...admin}],[user.subject,{...user}]]),audit=[];
 return {
  roles,audit,
  getBySubject:async sub=>roles.get(sub),
  transactRoleChange:async fn=>{
   const staged=new Map([...roles].map(([k,v])=>[k,{...v}])),events=[];
   const tx={
    getRole:async sub=>staged.get(sub),
    countEnabledAdmins:async()=>[...staged.values()].filter(v=>v.role==='admin'&&!v.disabled).length,
    updateRole:async(sub,changes)=>staged.set(sub,{...staged.get(sub),...changes}),
    appendAudit:async e=>events.push(e)
   };
   const result=await fn(tx);
   if(result.ok){roles.clear();for(const [k,v] of staged)roles.set(k,v);audit.push(...events);}
   return result;
  }
 };
}
const req=(method,path,body,auth=token())=>({method,path,headers:{authorization:'Bearer '+auth},body});
test('denies unauthenticated, invalid token and non-Admin',async()=>{
 const s=store(),handle=createAdminHttpHandler({clientId,getJwks,roleStore:s,now:()=>now});
 assert.equal((await handle({method:'GET',path:'/api/admin/me'})).status,401);
 assert.equal((await handle(req('GET','/api/admin/me',null,'garbage'))).status,401);
 assert.equal((await handle(req('GET','/api/admin/me',null,token('222222222222')))).status,403);
 assert.equal(s.audit.length,0);
});
test('authorized identity, strict input, role change and audit',async()=>{
 const s=store(),handle=createAdminHttpHandler({clientId,getJwks,roleStore:s,now:()=>now});
 const me=await handle(req('GET','/api/admin/me'));
 assert.equal(me.status,200);assert.equal(me.body.role,'admin');
 assert.equal(me.headers['cache-control'],'no-store');
 const payload={targetSubject:user.subject,newRole:'admin',confirmation:'CONFIRM',expectedVersion:0,correlationId:'request_12345'};
 assert.equal((await handle(req('POST','/api/admin/roles/change',{...payload,actor:admin}))).status,400);
 const changed=await handle(req('POST','/api/admin/roles/change',payload));
 assert.equal(changed.status,200);assert.equal(s.roles.get(user.subject).role,'admin');assert.equal(s.audit.length,1);
 assert.equal((await handle(req('POST','/api/admin/roles/change',{...payload,newRole:'user'}))).status,409);
 assert.equal(s.audit.length,1);
});
test('unknown route and method fail closed',async()=>{
 const handle=createAdminHttpHandler({clientId,getJwks,roleStore:store(),now:()=>now});
 assert.equal((await handle(req('POST','/api/admin/me'))).status,405);
 assert.equal((await handle(req('GET','/api/admin/unknown'))).status,404);
});
