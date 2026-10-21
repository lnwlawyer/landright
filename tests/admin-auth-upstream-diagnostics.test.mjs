import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeFirebaseAdmin} from '../admin/firebase-auth-gate.mjs';
const args={authorization:'Bearer '+('a'.repeat(30)),getAdminRole:async()=>({role:'admin',is_active:true})};
test('trusted revocation upstream failure is 503 not misleading 401',async()=>{
 const firebaseAuth={verifyIdToken:async()=>{const e=new Error('unavailable');e.code='FIREBASE_AUTH_UPSTREAM_UNAVAILABLE';throw e;}};
 assert.deepEqual(await authorizeFirebaseAdmin({...args,firebaseAuth}),{ok:false,status:503,reason:'firebase_auth_upstream_unavailable'});
});
test('invalid Firebase signature remains 401',async()=>{
 const firebaseAuth={verifyIdToken:async()=>{throw Error('invalid signature');}};
 assert.deepEqual(await authorizeFirebaseAdmin({...args,firebaseAuth}),{ok:false,status:401,reason:'invalid_or_revoked_firebase_token'});
});
