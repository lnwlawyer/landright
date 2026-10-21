import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleWifTokenSource} from '../admin/google-wif-token.mjs';
import {createWorkersFirebaseServices} from '../admin/cloudflare-firebase-entry.mjs';

const audience='//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/landright/providers/oidc';

test('WIF STS token can be injected into Google REST readers without private key',async()=>{
 const calls=[];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,init});
  if(url==='https://sts.googleapis.com/v1/token')return Response.json({access_token:'ephemeral-google-token',expires_in:3600,token_type:'Bearer'});
  if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'uid1',validSince:'1750000000',disabled:false}]});
  if(url.includes('/documents/landrightAdminRoles/uid1'))return Response.json({fields:{role:{stringValue:'admin'},is_active:{booleanValue:true}}});
  throw Error('Unexpected URL: '+url);
 };
 const googleAccessToken=createGoogleWifTokenSource({audience,getSubjectToken:async()=> 'trusted.oidc.assertion-from-idp',fetchImpl,now:()=>1760000000000});
 const services=createWorkersFirebaseServices({googleAccessToken,fetchImpl,now:()=>1760000000000});
 assert.deepEqual(await services.getAdminRole('uid1'),{role:'admin',is_active:true});
 assert.equal(calls.filter(x=>x.url==='https://sts.googleapis.com/v1/token').length,1);
 assert.ok(calls.filter(x=>x.url!=='https://sts.googleapis.com/v1/token').every(x=>x.init.headers.authorization==='Bearer ephemeral-google-token'));
});
test('STS failure denies role lookup rather than falling back to unsafe credentials',async()=>{
 const googleAccessToken=createGoogleWifTokenSource({audience,getSubjectToken:async()=> 'trusted.oidc.assertion-from-idp',fetchImpl:async()=>new Response('denied',{status:403})});
 const services=createWorkersFirebaseServices({googleAccessToken,fetchImpl:async()=>{throw Error('Must not call Google API');}});
 await assert.rejects(services.getAdminRole('uid1'),/STS exchange failed/);
});
