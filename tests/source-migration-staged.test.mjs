import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../smt2/source-migration.staged.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('new source mapping remains staged until privacy and access gates pass',()=>{
 assert.equal(config.status,'staged-not-active');
 assert.equal(config.publicSourceMode,'approved-export-required');
 assert.equal(config.allowPublicRawRecords,false);
 assert.equal(config.privateSheets.length,8);
 assert.equal(Object.keys(config.publicSheets).length,11);
 assert.ok(config.excludedSheets.includes('Config'));
 assert.ok(config.excludedSheets.includes('OrgChart'));
 assert.ok(!html.includes(config.sourceSpreadsheetId),'private source must not be embedded in public HTML');
 for(const sheet of config.privateSheets)assert.ok(!Object.values(config.publicSheets).includes(sheet));
});
