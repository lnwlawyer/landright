import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirestoreAdminRoleStore,roleDocumentId} from '../admin/firestore-role-store.mjs';
import {changeUserRole} from '../admin/role-mutation-service.mjs';

const admin={subject:'google:123456789012',role:'admin',disabled:false,version:0};
const user={subject:'google:999999999999',role:'user',disabled:false,version:2};
function fakeFirestore() {
 const collections=new Map([
  ['landrightAdminRoles',new Map([['123456789012',admin],['999999999999',user]])],
  ['landrightAdminMetadata',new Map([['roles',{enabledAdminCount:1,version:0}]])],
  ['landrightAdminAudit',new Map()]
 ]);
 let transactions=0;
 const db={
  collection(name){
   return {doc(id){
    const ref={name,id};
    return {...ref,get:async()=>({exists:collections.get(name).has(id),data:()=>collections.get(name).get(id)})};
   }};
  },
  async runTransaction(callback) {
   transactions++;
   const pending=[];
   const tx={
    get:async(ref)=>({exists:collections.get(ref.name).has(ref.id),data:()=>collections.get(ref.name).get(ref.id)}),
    update:(ref,changes)=>pending.push(()=>collections.get(ref.name).set(ref.id,{...collections.get(ref.name).get(ref.id),...changes})),
    create:(ref,value)=>{
     if(collections.get(ref.name).has(ref.id))throw Error('duplicate audit');
     pending.push(()=>collections.get(ref.name).set(ref.id,value));
    }
   };
   const result=await callback(tx);
   for(const write of pending)write();
   return result;
  }
 };
 return {db,collections,get transactions(){return transactions;}};
}
const input=(roleStore,overrides={})=>({
 actor:admin,targetSubject:user.subject,newRole:'admin',confirmation:'CONFIRM',expectedVersion:2,
 correlationId:'request_12345',roleStore,clock:()=> '2026-10-20T00:00:00Z',...overrides
});
test('maps Google subject to isolated Firestore document key',()=>{
 assert.equal(roleDocumentId(admin.subject),'123456789012');
 for(const bad of ['user','google:abc','google:123/456','google:'])assert.throws(()=>roleDocumentId(bad));
});
test('role and audit commit together, with metadata concurrency guard',async()=>{
 const f=fakeFirestore(),store=createFirestoreAdminRoleStore(f.db);
 assert.equal((await store.getBySubject(user.subject)).role,'user');
 const result=await changeUserRole(input(store));
 assert.equal(result.ok,true);
 assert.equal(f.collections.get('landrightAdminRoles').get('999999999999').role,'admin');
 assert.equal(f.collections.get('landrightAdminMetadata').get('roles').enabledAdminCount,2);
 assert.equal(f.collections.get('landrightAdminAudit').get('request_12345').actorId,admin.subject);
});
test('version conflict and missing confirmation leave Firestore unchanged',async()=>{
 const f=fakeFirestore(),store=createFirestoreAdminRoleStore(f.db);
 assert.equal((await changeUserRole(input(store,{expectedVersion:1}))).reason,'version-conflict');
 assert.equal((await changeUserRole(input(store,{confirmation:'NO'}))).ok,false);
 assert.equal(f.collections.get('landrightAdminAudit').size,0);
 assert.equal(f.collections.get('landrightAdminMetadata').get('roles').enabledAdminCount,1);
});
test('disabled server actor is rejected',async()=>{
 const f=fakeFirestore();
 f.collections.get('landrightAdminRoles').set('123456789012',{...admin,disabled:true});
 const store=createFirestoreAdminRoleStore(f.db);
 assert.equal((await changeUserRole(input(store))).reason,'forbidden');
 assert.equal(f.collections.get('landrightAdminAudit').size,0);
});
