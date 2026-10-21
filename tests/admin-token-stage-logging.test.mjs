import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkersFirebaseAuth} from '../admin/workers-firebase-auth.mjs';
test('logs only a fixed stage code when Firebase token is malformed',async()=>{
 const lines=[];const old=console.warn;console.warn=(...args)=>lines.push(args);
 try {
  const verifier=createWorkersFirebaseAuth({checkRevoked:async()=>false,fetchImpl:async()=>{throw Error('must not fetch')}});
  const secret='sensitive-bearer-credential';
  await assert.rejects(verifier.verifyIdToken(secret,true));
  assert.equal(lines.length,1);
  assert.equal(lines[0][0],'landright_admin_firebase_token_verification_failed');
  assert.deepEqual(lines[0][1],{stage:'jwt_shape'});
  assert.equal(JSON.stringify(lines).includes(secret),false);
 } finally {console.warn=old;}
});
