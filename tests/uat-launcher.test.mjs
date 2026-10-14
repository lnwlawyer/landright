import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const run=args=>spawnSync('python3',['scripts/serve-smt2-uat.py',...args],{encoding:'utf8',timeout:5000});
test('live UAT requires an explicit separate spreadsheet ID',()=>{
 const result=run(['--mode','live']);assert.equal(result.status,2);assert.match(result.stderr,/existing restricted synthetic UAT file/);
});
test('live UAT refuses the production spreadsheet ID',()=>{
 const config=readFileSync('smt2-config.example.js','utf8');const id=config.match(/spreadsheetId:\s*'([^']+)'/)[1];
 const result=run(['--mode','live','--spreadsheet-id',id]);assert.equal(result.status,2);assert.match(result.stderr,/Production spreadsheet ID is refused/);
});
test('UAT rejects invalid port and malformed public client ID',()=>{
 assert.equal(run(['--port','0']).status,2);
 assert.equal(run(['--mode','live','--spreadsheet-id','SYNTHETIC','--oauth-client-id','invalid']).status,2);
});

test('approved-source selection is explicit and cannot be mixed with a UAT file',()=>{
 assert.equal(run(['--use-approved-source']).status,2);
 assert.equal(run(['--mode','live','--use-approved-source','--spreadsheet-id','SYNTHETIC']).status,2);
});
