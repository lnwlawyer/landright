import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifyGoogleIdToken} from '../admin/google-id-token.mjs';
import {authorizeGoogleAdminRequest} from '../admin/server-auth-gate.mjs';

const clientId='123456789-abc.apps.googleusercontent.com';
const now=Date.parse('2026-10-20T10:00:00Z');
const seconds=Math.floor(now/1000);
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});
const getJwks=async()=>({keys:[{...jwk,kid:'testkey',use:'sig',alg:'RS256'}]});
const claims={iss:'https://accounts.google.com',aud:clientId,sub:'12345678901234567890',iat:seconds-30,exp:seconds+3600};
function token(payload=claims,header={alg:'RS256',typ:'JWT',kid:'testkey'},key=privateKey){
 const encoded=[header,payload].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));
 return encoded.join('.')+'.'+sign('RSA-SHA256',Buffer.from(encoded.join('.')),key).toString('base64url');
}
test('valid signed ID token yields immutable Google subject, not role from JWT',async()=>{
 const identity=await verifyGoogleIdToken(token({...claims,role:'admin'}),{clientId,getJwks,now});
 assert.equal(identity.subject,'google:'+claims.sub);
 assert.equal(identity.role,undefined);
});
test('rejects tampered signature, expiry, audience, issuer, future issuance and injected header keys',async()=>{
 const bad=[
  token({...claims,exp:seconds-1}),token({...claims,aud:'another-client'}),
  token({...claims,iss:'https://attacker.example'}),token({...claims,iat:seconds+3600}),
  token(claims,{alg:'none',kid:'testkey'}),token(claims,{alg:'RS256',kid:'testkey',jku:'https://attacker.example/jwks'}),
  token(claims).slice(0,-5)+'abcde'
 ];
 for(const value of bad)await assert.rejects(()=>verifyGoogleIdToken(value,{clientId,getJwks,now}));
 await assert.rejects(()=>verifyGoogleIdToken(token(),{clientId,getJwks:async()=>{throw Error('offline')},now}));
 await assert.rejects(()=>verifyGoogleIdToken('not-an-id-token',{clientId,getJwks,now}));
});
test('authorization depends only on trusted server role store',async()=>{
 const idToken=token({...claims,role:'admin'});
 const input={idToken,action:'users.read',clientId,getJwks,now};
 assert.equal((await authorizeGoogleAdminRequest({...input,roleStore:{getBySubject:async()=>({subject:'google:'+claims.sub,role:'user',disabled:false})}})).allowed,false);
 assert.equal((await authorizeGoogleAdminRequest({...input,roleStore:{getBySubject:async()=>({subject:'google:'+claims.sub,role:'admin',disabled:false})}})).allowed,true);
 assert.equal((await authorizeGoogleAdminRequest({...input,roleStore:{getBySubject:async()=>null}})).allowed,false);
 assert.equal((await authorizeGoogleAdminRequest({...input,roleStore:{getBySubject:async()=>({subject:'google:'+claims.sub,role:'admin',disabled:true})}})).allowed,false);
 await assert.rejects(()=>authorizeGoogleAdminRequest({...input,roleStore:null}));
});
