import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createFirestoreAdminRoleStore} from '../admin/firestore-role-store.mjs';
import {changeUserRole} from '../admin/role-mutation-service.mjs';

/**
 * Opt-in integration suite. Run ONLY against a local Firestore emulator.
 * npm test skips this suite unless LANDRIGHT_FIRESTORE_EMULATOR_TEST=1.
 * Install firebase-admin in a separate local test environment first.
 */
const enabled=process.env.LANDRIGHT_FIRESTORE_EMULATOR_TEST==='1';
const host=process.env.FIRESTORE_EMULATOR_HOST;
const localHost=/^(localhost|127\.0\.0\.1|\[::1\]):[0-9]{2,5}$/.test(host??'');
test('Firestore emulator: concurrent promotions, audit and rollback', {skip:!enabled},async()=>{
 if(!localHost) throw Error('Refusing to run: FIRESTORE_EMULATOR_HOST must be localhost:port');
 const {initializeApp,deleteApp}=await import('firebase-admin/app');
 const {getFirestore}=await import('firebase-admin/firestore');
 const projectId='landright-emulator-test-'+randomUUID().slice(0,12);
 const app=initializeApp({projectId},'landright-emulator-'+randomUUID());
 const db=getFirestore(app);
 const admin='google:123456789012',a='google:222222222222',b='google:333333333333';
 const roles=db.collection('landrightAdminRoles'),audit=db.collection('landrightAdminAudit');
 const meta=db.collection('landrightAdminMetadata').doc('roles');
 const actor={subject:admin,role:'admin',disabled:false,version:0};
 try {
   await Promise.all([
     roles.doc('123456789012').set(actor),
     roles.doc('222222222222').set({subject:a,role:'user',disabled:false,version:0}),
     roles.doc('333333333333').set({subject:b,role:'user',disabled:false,version:0}),
     meta.set({enabledAdminCount:1,version:0})
   ]);
   const store=createFirestoreAdminRoleStore(db);
   const change=(subject,id)=>changeUserRole({
     actor,targetSubject:subject,newRole:'admin',confirmation:'CONFIRM',expectedVersion:0,
     correlationId:id,roleStore:store
   });
   const [ra,rb]=await Promise.all([change(a,'request_promote_a'),change(b,'request_promote_b')]);
   assert.equal(ra.ok,true);assert.equal(rb.ok,true);
   assert.equal((await meta.get()).data().enabledAdminCount,3);
   assert.equal((await audit.get()).size,2);
   assert.equal((await roles.doc('222222222222').get()).data().role,'admin');
   assert.equal((await roles.doc('333333333333').get()).data().role,'admin');
   const conflict=await change(a,'request_conflict_a');
   assert.equal(conflict.ok,false);
   assert.equal((await audit.get()).size,2);
   await assert.rejects(changeUserRole({
     actor,targetSubject:a,newRole:'user',confirmation:'CONFIRM',expectedVersion:1,
     correlationId:'request_promote_a',roleStore:store
   }));
   assert.equal((await roles.doc('222222222222').get()).data().role,'admin');
   assert.equal((await meta.get()).data().enabledAdminCount,3);
   assert.equal((await audit.get()).size,2);
 } finally {
   await deleteApp(app);
 }
});
