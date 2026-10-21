import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkersFirebaseAuth} from '../admin/workers-firebase-auth.mjs';
test('JWKS fetch does not depend on AbortSignal.timeout support',async()=>{
 const original=AbortSignal.timeout;
 const calls=[];
 try {
  AbortSignal.timeout=()=>{throw new Error('unsupported runtime API')};
  const token=[Buffer.from(JSON.stringify({alg:'RS256',kid:'key'})).toString('base64url'),Buffer.from(JSON.stringify({sub:'u'})).toString('base64url'),'signature'].join('.');
  const verifier=createWorkersFirebaseAuth({fetchImpl:async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify({keys:[]}),{status:200});},checkRevoked:async()=>false});
  const old=console.warn;console.warn=()=>{};
  try{await assert.rejects(verifier.verifyIdToken(token,true),/Invalid Google JWKS/);}finally{console.warn=old;}
  assert.equal(calls.length,1);
  assert.equal(calls[0].opts.method,'GET');
  assert.equal(calls[0].opts.signal,undefined);
 } finally {AbortSignal.timeout=original;}
});
