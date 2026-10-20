import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createWorkersFirebaseServices} from '../admin/cloudflare-firebase-entry.mjs';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const secret=JSON.stringify({type:'service_account',project_id:'landright-admin',client_email:'test@landright-admin.iam.gserviceaccount.com',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
const now=1760000000000;
const requests=[];
const fetchImpl=async(url,options)=>{
 requests.push({url,options});
 if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-access-token',expires_in:3600});
 if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'uid1',validSince:'1750000000',disabled:false}]});
 if(url.includes('/documents/landrightAdminRoles/uid1'))return Response.json({fields:{role:{stringValue:'admin'},is_active:{booleanValue:true}}});
 return new Response(null,{status:404});
};
test('requires scoped trusted service account credential',()=>{
 assert.throws(()=>createWorkersFirebaseServices({serviceAccountJson:'{}',fetchImpl}),/identity/);
 assert.throws(()=>createWorkersFirebaseServices({serviceAccountJson:JSON.stringify({...JSON.parse(secret),project_id:'other'}),fetchImpl}),/identity/);
});
test('Google REST user revocation and Firestore role are server-owned',async()=>{
 requests.length=0;
 const services=createWorkersFirebaseServices({serviceAccountJson:secret,fetchImpl,now:()=>now});
 assert.deepEqual(await services.getAdminRole('uid1'),{role:'admin',is_active:true});
 assert.ok(requests.some(r=>r.url==='https://oauth2.googleapis.com/token'));
 assert.ok(requests.some(r=>r.url.includes('/documents/landrightAdminRoles/uid1')));
 assert.equal(requests.filter(r=>r.url==='https://oauth2.googleapis.com/token').length,1);
});
test('role lookups reject invalid uid',async()=>{
 const services=createWorkersFirebaseServices({serviceAccountJson:secret,fetchImpl,now:()=>now});
 await assert.rejects(services.getAdminRole('uid/../../other'),/uid/);
});
test('missing credential returns fail-closed HTTP 503',async()=>{
 const {default:worker}=await import('../admin/cloudflare-firebase-entry.mjs');
 const response=await worker.fetch(new Request('https://worker.example/api/admin/me'),{});
 assert.equal(response.status,503);
});
