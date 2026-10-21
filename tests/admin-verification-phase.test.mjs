import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkersFirebaseAuth} from '../admin/workers-firebase-auth.mjs';
test('unexpected JWKS fetch failure logs fixed phase without leaking token or error',async()=>{
 const logs=[],old=console.warn;
 console.warn=(...args)=>logs.push(args);
 const token=[Buffer.from(JSON.stringify({alg:'RS256',kid:'k'})).toString('base64url'),Buffer.from(JSON.stringify({sub:'uid'})).toString('base64url'),'sig'].join('.');
 try{
  const auth=createWorkersFirebaseAuth({fetchImpl:async()=>{throw Error('sensitive upstream detail');},checkRevoked:async()=>false});
  await assert.rejects(auth.verifyIdToken(token,true));
  assert.deepEqual(logs,[['landright_admin_google_jwks_request_failed',{category:'fetch_exception'}],['landright_admin_firebase_token_verification_failed',{stage:'auth_upstream_unavailable'}]]);
  assert.equal(JSON.stringify(logs).includes(token),false);
 }finally{console.warn=old;}
});
