import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleWifTokenSource} from '../admin/google-wif-token.mjs';
const audience='//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/landright/providers/oidc';
test('requires a trusted OIDC assertion provider',()=>{
 assert.throws(()=>createGoogleWifTokenSource({audience}),/Trusted OIDC/);
 assert.throws(()=>createGoogleWifTokenSource({audience:'bad',getSubjectToken:async()=>''}),/Invalid WIF/);
});
test('exchanges external assertion at Google STS and caches token',async()=>{
 let calls=0;const token=createGoogleWifTokenSource({audience,getSubjectToken:async()=> 'signed.oidc.assertion-from-trusted-idp',
 now:()=>100000,fetchImpl:async(url,init)=>{calls++;assert.equal(url,'https://sts.googleapis.com/v1/token');
 const body=JSON.parse(init.body);assert.equal(body.audience,audience);
 assert.equal(body.subjectTokenType,'urn:ietf:params:oauth:token-type:jwt');
 return {ok:true,json:async()=>({access_token:'short-lived',expires_in:3600,token_type:'Bearer'})};}});
 assert.equal(await token(),'short-lived');assert.equal(await token(),'short-lived');assert.equal(calls,1);
});
test('fails closed on unavailable STS or malformed response',async()=>{
 const token=createGoogleWifTokenSource({audience,getSubjectToken:async()=> 'signed.oidc.assertion-from-trusted-idp',
 fetchImpl:async()=>({ok:false})});await assert.rejects(token(),/STS exchange failed/);
});
