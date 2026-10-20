import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createGoogleJwksProvider} from '../admin/google-jwks-provider.mjs';
const {publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});
const data={keys:[{...jwk,kid:'key1',use:'sig',alg:'RS256'}]};
const response=(value=data,headers={})=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json','cache-control':'public, max-age=60',...headers}});
test('trusted URL, strict request options, cached until expiry',async()=>{
 let now=0,calls=0;
 const fetchImpl=async(url,options)=>{calls++;assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');return response();};
 const get=createGoogleJwksProvider({fetchImpl,clock:()=>now});
 assert.equal((await get()).keys[0].kid,'key1');
 await get();assert.equal(calls,1);
 now=60000;await get();assert.equal(calls,2);
});
test('concurrent requests share one fetch and invalid data fails closed',async()=>{
 let calls=0;
 const get=createGoogleJwksProvider({fetchImpl:async()=>{calls++;return response();}});
 await Promise.all([get(),get(),get()]);assert.equal(calls,1);
 for(const value of [
  {keys:[]},{keys:[{...data.keys[0],kid:'key1'},data.keys[0]]},
  {keys:[{...data.keys[0],n:'invalid!'}]},{keys:[{...data.keys[0],kty:'EC'}]}
 ]) await assert.rejects(()=>createGoogleJwksProvider({fetchImpl:async()=>response(value)})());
});
test('rejects redirects, oversized response, unexpected content type and fetch errors',async()=>{
 const cases=[
  async()=>new Response('',{status:302,headers:{location:'https://evil.example'}}),
  async()=>response(data,{'content-length':'999999'}),
  async()=>response(data,{'content-type':'text/html'}),
  async()=>new Response('x'.repeat(66000),{headers:{'content-type':'application/json'}}),
  async()=>{throw Error('offline');}
 ];
 for(const fetchImpl of cases)await assert.rejects(()=>createGoogleJwksProvider({fetchImpl})());
});
test('failed refresh never silently extends an expired key cache',async()=>{
 let now=0,calls=0;
 const get=createGoogleJwksProvider({clock:()=>now,fetchImpl:async()=>{calls++;if(calls===1)return response();throw Error('offline');}});
 await get();now=61000;await assert.rejects(()=>get());await assert.rejects(()=>get());assert.equal(calls,3);
});
