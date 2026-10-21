import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkersFirebaseServices} from '../admin/cloudflare-firebase-entry.mjs';

test('trusted injected Google token provider reads roles without private key',async()=>{
 const calls=[];
 const services=createWorkersFirebaseServices({googleAccessToken:async()=> 'short-lived-token',fetchImpl:async(url,options)=>{
  calls.push({url,options});
  if(url.includes('landrightAdminRoles/uid1'))return Response.json({fields:{role:{stringValue:'admin'},is_active:{booleanValue:true}}});
  throw Error('unexpected URL');
 }});
 assert.deepEqual(await services.getAdminRole('uid1'),{role:'admin',is_active:true});
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.headers.authorization,'Bearer short-lived-token');
});
test('credential source cannot be ambiguous or missing',()=>{
 assert.throws(()=>createWorkersFirebaseServices({googleAccessToken:'unsafe'}),/Invalid Google token provider/);
 assert.throws(()=>createWorkersFirebaseServices({googleAccessToken:async()=>'',serviceAccountJson:'{}'}),/Ambiguous/);
 assert.throws(()=>createWorkersFirebaseServices({}),/Missing Worker credential/);
});
test('token provider failure fails closed',async()=>{
 const services=createWorkersFirebaseServices({googleAccessToken:async()=>{throw Error('identity unavailable');}});
 await assert.rejects(services.getAdminRole('uid1'),/identity unavailable/);
});
