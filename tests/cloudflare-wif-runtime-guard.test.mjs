import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../admin/cloudflare-firebase-entry.mjs';

// Configuration strings, GitHub OIDC, or a user-supplied token are not a
// trustworthy workload identity available to the deployed Worker.
test('WIF settings alone cannot unlock the production admin API',async()=>{
  const env={
    GOOGLE_WIF_AUDIENCE:'//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/example/providers/oidc',
    GOOGLE_WIF_SUBJECT_TOKEN:'forged.jwt.value',
    GITHUB_ACTIONS_ID_TOKEN_REQUEST_URL:'https://example.invalid/token',
    GITHUB_ACTIONS_ID_TOKEN_REQUEST_TOKEN:'not-a-runtime-identity'
  };
  const response=await worker.fetch(new Request('https://worker.example/api/admin/me'),env);
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{error:'admin_backend_not_configured'});
});
test('request-provided identity headers cannot unlock the API',async()=>{
 const request=new Request('https://worker.example/api/admin/me',{headers:{
   authorization:'Bearer fake', 'cf-access-jwt-assertion':'untrusted',
   'x-goog-iap-jwt-assertion':'untrusted'
 }});
 const response=await worker.fetch(request,{});
 assert.equal(response.status,503);
});
