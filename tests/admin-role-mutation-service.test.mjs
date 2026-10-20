import test from 'node:test';
import assert from 'node:assert/strict';
import {changeUserRole} from '../admin/role-mutation-service.mjs';

const admin={subject:'google:123456789012',role:'admin',disabled:false,version:0};
const user={subject:'google:999999999999',role:'user',disabled:false,version:2};
function store(initial=[admin,user]) {
 const state=new Map(initial.map(x=>[x.subject,{...x}])),audit=[];
 return {
  state,audit,
  async transactRoleChange(work) {
   const snapshot=new Map([...state].map(([k,v])=>[k,{...v}])),pending=[];
   const tx={
    getRole:async key=>snapshot.get(key),
    countEnabledAdmins:async()=>[...snapshot.values()].filter(x=>x.role==='admin'&&!x.disabled).length,
    updateRole:async(key,change)=>{snapshot.set(key,{...snapshot.get(key),...change});},
    appendAudit:async event=>{pending.push(event);}
   };
   const result=await work(tx);
   if(result.ok){state.clear();for(const [k,v] of snapshot)state.set(k,v);audit.push(...pending);}
   return result;
  }
 };
}
const input=(roleStore,overrides={})=>({
 actor:admin,targetSubject:user.subject,newRole:'admin',confirmation:'CONFIRM',
 expectedVersion:2,correlationId:'request_12345',roleStore,
 clock:()=> '2026-10-20T00:00:00Z',...overrides
});
test('role update increments version and records minimal audit metadata atomically',async()=>{
 const s=store(),result=await changeUserRole(input(s));
 assert.deepEqual(result,{ok:true,subject:user.subject,version:3});
 assert.equal(s.state.get(user.subject).role,'admin');
 assert.equal(s.audit.length,1);
 assert.equal(s.audit[0].action,'users.role.update');
 assert.equal(s.audit[0].actorId,admin.subject);
});
test('denies non-admin, self-change, wrong version, missing confirmation, disabled actor',async()=>{
 const s=store();
 for(const overrides of [
  {actor:user},{targetSubject:admin.subject,expectedVersion:0},
  {expectedVersion:1},{confirmation:'no'}
 ])assert.equal((await changeUserRole(input(s,overrides))).ok,false);
 assert.equal(s.audit.length,0);assert.equal(s.state.get(user.subject).role,'user');
 const disabled=store([{...admin,disabled:true},user]);
 assert.equal((await changeUserRole(input(disabled))).reason,'forbidden');
});
test('last enabled Admin cannot be demoted',async()=>{
 const s=store();
 const result=await changeUserRole(input(s,{targetSubject:admin.subject,newRole:'user',expectedVersion:0}));
 assert.equal(result.ok,false);
 assert.equal(s.state.get(admin.subject).role,'admin');
});
test('transaction store required and rejects invalid correlation IDs',async()=>{
 await assert.rejects(()=>changeUserRole(input(null)));
 const s=store();
 assert.equal((await changeUserRole(input(s,{correlationId:'bad'}))).ok,false);
});
