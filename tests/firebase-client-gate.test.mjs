import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseAdminClient} from '../admin/firebase-client-gate.mjs';
const user={uid:'u1',getIdToken:async()=> 'firebase-token'};
const config=(status=200,body={role:'admin',uid:'u1'})=>{
 const auth={currentUser:user};
 const calls=[];
 const client=createFirebaseAdminClient({auth,GoogleAuthProvider:class {},signInWithPopup:async()=>{},signOut:async()=>{auth.currentUser=null;},apiBaseUrl:'https://admin.example.org',fetchImpl:async(url,opts)=>{calls.push({url:String(url),opts});return {ok:status===200,status,json:async()=>body};}});
 return {client,calls,auth};
};
test('accepts matching verified admin',async()=>{const {client,calls}=config();assert.equal((await client.refresh()).authorized,true);assert.equal(client.isAuthorized(),true);assert.equal(calls[0].opts.credentials,'omit');});
test('denies non-admin role',async()=>{const {client}=config(403);assert.equal((await client.refresh()).authorized,false);assert.equal(client.isAuthorized(),false);});
test('rejects UID mismatch',async()=>{const {client}=config(200,{role:'admin',uid:'other'});assert.equal((await client.refresh()).authorized,false);});
test('logout clears cached authorization',async()=>{const {client}=config();await client.refresh();await client.logout();assert.equal(client.isAuthorized(),false);});
test('signed out cannot fetch private endpoint',async()=>{const {client,auth,calls}=config();auth.currentUser=null;assert.equal((await client.refresh()).authorized,false);assert.equal(calls.length,0);});
test('rejects insecure backend URL',()=>assert.throws(()=>createFirebaseAdminClient({apiBaseUrl:'http://localhost:8080'}),/HTTPS/));
