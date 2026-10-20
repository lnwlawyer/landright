import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createWorkersFirebaseAuth} from '../admin/workers-firebase-auth.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
const now=1760000000000,sec=Math.floor(now/1000);
const claims={aud:'landright-admin',iss:'https://securetoken.google.com/landright-admin',sub:'firebase-uid',iat:sec-60,exp:sec+3600,auth_time:sec-60,firebase:{sign_in_provider:'google.com'}};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(body=claims){const data=enc({alg:'RS256',typ:'JWT',kid:'test-key'})+'.'+enc(body);return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');}
const fetchImpl=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'cache-control':'public,max-age=300'}});
const auth=(revoked=async()=>false)=>createWorkersFirebaseAuth({fetchImpl,checkRevoked:revoked,now:()=>now});
test('requires a trusted revocation callback',()=>assert.throws(()=>createWorkersFirebaseAuth({fetchImpl}),/revocation/));
test('verifies Firebase signed JWT and calls revocation check',async()=>{
 let uid;const verifier=auth(async x=>{uid=x;return false;});
 const verified=await verifier.verifyIdToken(token(),true);
 assert.equal(verified.uid,'firebase-uid');assert.equal(uid,'firebase-uid');
});
test('rejects missing revocation enforcement',async()=>assert.rejects(auth().verifyIdToken(token(),false)));
test('rejects revoked and indeterminate revocation checks',async()=>{
 await assert.rejects(auth(async()=>true).verifyIdToken(token(),true));
 await assert.rejects(auth(async()=>undefined).verifyIdToken(token(),true));
});
test('rejects wrong audience, issuer and expired tokens',async()=>{
 for(const override of [{aud:'other'},{iss:'https://accounts.google.com'},{exp:sec-1}]){
  await assert.rejects(auth().verifyIdToken(token({...claims,...override}),true));
 }
});
test('rejects tampered signature',async()=>{
 const value=token();const parts=value.split('.');parts[1]=enc({...claims,sub:'attacker'});
 await assert.rejects(auth().verifyIdToken(parts.join('.'),true));
});
test('rejects missing key and unavailable JWKS',async()=>{
 const verifier=createWorkersFirebaseAuth({fetchImpl:async()=>new Response(JSON.stringify({keys:[]})),checkRevoked:async()=>false,now:()=>now});
 await assert.rejects(verifier.verifyIdToken(token(),true));
});
