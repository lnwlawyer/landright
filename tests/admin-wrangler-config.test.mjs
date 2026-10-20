import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
test('Wrangler deploys only the dedicated LandRight Admin Worker',()=>{
 assert.match(config,/^name\s*=\s*"landright-admin-api"\s*$/m);
 assert.match(config,/^main\s*=\s*"admin\/cloudflare-firebase-entry\.mjs"\s*$/m);
 assert.doesNotMatch(config,/^\s*(route|routes|account_id|zone_id)\s*=/m);
 assert.doesNotMatch(config,/firebase-readonly-mcp|firebase-mcp-builds/);
});
test('No service account key or Worker secret value is committed',()=>{
 assert.doesNotMatch(config,/-----BEGIN PRIVATE KEY-----/);
 assert.doesNotMatch(config,/^\s*FIREBASE_SERVICE_ACCOUNT_JSON\s*=/m);
});
