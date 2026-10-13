import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const code=fs.readFileSync('smt2.js','utf8');
test('SMT2 is embedded',()=>assert.ok(html.includes('id="smt2-content"')));
test('SMT2 loads direct Sheets API',()=>assert.ok(code.includes('sheets.googleapis.com')));
test('SMT2 has no Apps Script shortcut',()=>assert.ok(!html.includes('script.google.com/macros')));
