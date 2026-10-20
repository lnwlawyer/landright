import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDRIGHT_FIREBASE_CONFIG as config} from '../firebase-web-config.mjs';

test('LandRight Firebase config is isolated and public identifiers only',()=>{
 assert.equal(config.projectId,'landright-admin');
 assert.equal(config.authDomain,'landright-admin.firebaseapp.com');
 assert.equal(config.storageBucket,'landright-admin.firebasestorage.app');
 assert.match(config.appId,/^1:632964870234:web:[a-f0-9]+$/);
 assert.equal(Object.isFrozen(config),true);
 for(const forbidden of ['privateKey','clientEmail','serviceAccount','accessToken','idToken','databaseURL']) {
   assert.equal(Object.hasOwn(config,forbidden),false);
 }
});
