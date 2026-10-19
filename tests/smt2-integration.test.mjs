import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAFF_SHEETS, READONLY_SCOPE, parseSheet, filterRecords, summarize, readStaffSheets} from '../smt2/sheets-reader.mjs';
const html=readFileSync('index.html','utf8');
const code=readFileSync('smt2.js','utf8');
const reader=readFileSync('smt2/sheets-reader.mjs','utf8');
const response = (values = [['จังหวัด','เรื่อง','เลขที่หนังสือ','เจ้าหน้าที่','สถานะ'],['ทดสอบ','เรื่องจำลอง','TEST-ONLY','จำลอง','รอดำเนินการ']]) => ({ok:true,json:async()=>({valueRanges:STAFF_SHEETS.map(sheet=>({range:`'${sheet}'!A1:E2`,values}))})});
test('OAuth staff UI replaces Apps Script without removing LandRight navigation',()=>{
 assert.match(html,/id="smt2-content"/); assert.match(html,/data-smt2-menu/);
 assert.doesNotMatch(html,/script.google.com\/macros/);
 assert.match(html,/src="smt2.js" type="module"/);
 for (const section of ['overview','foreigners','religious','abandoned','users','settings']) assert.ok(html.includes(`id="${section}-content"`));
});

test('OAuth tokens are not persisted or placed in URL parameters', () => {
  const withoutComments = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  // Remembering a login preference is permitted.
  assert.match(
    withoutComments,
    /localStorage\.setItem\(REMEMBER_GOOGLE_KEY,\s*['"]yes['"]\)/
  );

  // Token values must not be written to persistent browser storage.
  assert.doesNotMatch(
    withoutComments,
    /(?:localStorage|sessionStorage)\.setItem\s*\([^;]*(?:access_token|id_token|refresh_token|\btoken\b)/i
  );

  // Token values must not be inserted into URL parameters.
  assert.doesNotMatch(
    withoutComments,
    /(?:searchParams\.set|searchParams\.append)\s*\(\s*['"](?:access_token|id_token|refresh_token)['"]/i
  );

  assert.equal(
    READONLY_SCOPE,
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  );
});

test('anonymous reader performs zero API calls',async()=>{
 let calls=0;
 await assert.rejects(readStaffSheets({spreadsheetId:'test',accessToken:null,fetchImpl:()=>{calls++;}}),/เข้าสู่ระบบ/);
 assert.equal(calls,0);
});
test('invalid spreadsheet configuration performs zero API calls',async()=>{
 let calls=0;
 await assert.rejects(readStaffSheets({spreadsheetId:'../evil',accessToken:'FAKE_TEST_TOKEN',fetchImpl:()=>{calls++;}}),/รหัส/); assert.equal(calls,0);
});
test('reads exactly eight unrestricted staff ranges with readonly GET and authorization header',async()=>{
 const result=await readStaffSheets({spreadsheetId:'synthetic',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async(url,opts)=>{
  const u=new URL(url); assert.equal(u.origin,'https://sheets.googleapis.com');
  assert.deepEqual(u.searchParams.getAll('ranges'),STAFF_SHEETS.map(s=>`'${s}'`));
  assert.equal(opts.method,'GET'); assert.equal(opts.headers.Authorization,'Bearer FAKE_TEST_TOKEN');
  assert.equal(opts.credentials,'omit'); assert.equal(opts.redirect,'error'); assert.equal(opts.cache,'no-store');
  assert.ok(!u.href.includes('FAKE_TEST_TOKEN')); return response();
 }});
 assert.equal(result.records.length,8); assert.deepEqual(result.warnings,[]);
});
test('header aliases normalize whitespace, BOM, zero-width characters, and English case',()=>{
 const result=parseSheet([[' Province ','ชื่อ\u200bเรื่อง','เลขที่รับ','ผู้รับผิดชอบ','\uFEFFสถานะการดำเนินการ'],['A','B','C','D','E']],'test');
 assert.deepEqual(result.records.map(({ sheet, province, subject, reference, officer, status }) => ({
    sheet, province, subject, reference, officer, status
  })),
  [{
    sheet: 'test',
    province: 'A',
    subject: 'B',
    reference: 'C',
    officer: 'D',
    status: 'E'
  }]
);
assert.deepEqual(result.missing, []);
});

test('aliases use priority, while duplicate headers and malformed data are rejected', () => {
  const result = parseSheet(
    [['เรื่อง', 'subject'], ['A', 'B']],
    'test'
  );

  assert.equal(result.records[0].subject, 'A');

  assert.throws(
    () => parseSheet(
      [['เรื่อง', 'เรื่อง'], ['A', 'B']],
      'test'
    ),
    /ซ้ำ/
  );

  assert.throws(
    () => parseSheet(
      [['เรื่อง'], [{ unsafe: 'x' }]],
      'test'
    ),
    /รูปแบบ/
  );
});

test('empty staff tabs are valid and do not invent records',async()=>{
 const result=await readStaffSheets({spreadsheetId:'test',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async()=>response([])});
 assert.deepEqual(result.records,[]);
});
test('missing or wrongly identified ranges fail closed',async()=>{
 for(const ranges of [[],STAFF_SHEETS.map(s=>({range:"'wrong'!A1",values:[]})),STAFF_SHEETS.map(()=>({values:[]}))]){
  await assert.rejects(readStaffSheets({spreadsheetId:'test',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async()=>({ok:true,json:async()=>({valueRanges:ranges})})}));
 }
});
test('reads records beyond the old 1000-row limit',async()=>{
 const values=[['เรื่อง'],...Array.from({length:1200},(_,i)=>['จำลอง '+i])];
 const result=await readStaffSheets({spreadsheetId:'test',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async()=>response(values)});
 assert.equal(result.records.length,9600); assert.equal(result.warnings.length,8);
});
for(const status of [401,403,404,429,500]) test(`API ${status} rejects without exposing response body`,async()=>{
 await assert.rejects(readStaffSheets({spreadsheetId:'test',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async()=>({ok:false,status,json:()=>{throw Error('must not read private error');}})}));
});
test('search, sheet, status and province filters combine, summaries reconcile',()=>{
 const rows=[{sheet:'A',status:'รอ',subject:'ตัวอย่าง หนึ่ง',province:'B'},{sheet:'A',status:'สำเร็จ',subject:'สอง',province:'C'},{sheet:'D',status:'',subject:'สาม',province:'B'}];
 assert.equal(filterRecords(rows,{query:'ตัวอย่างหนึ่ง',sheet:'A',status:'รอ',province:'B'}).length,1);
 assert.equal(filterRecords(rows,{status:'ไม่ระบุสถานะ'}).length,1);
 assert.equal(filterRecords(rows,{query:'ไม่พบ'}).length,0);
 const s=summarize(rows); assert.equal(s.total,3); for(const groups of [s.bySheet,s.byStatus]) assert.equal(groups.reduce((n,[,count])=>n+count,0),3);
});
test('prototype-like sheet values are counted safely',()=>assert.deepEqual(summarize([{sheet:'__proto__',status:'constructor'}]).byStatus,[['constructor',1]]));
test('malformed JSON produces a safe error without echoing private body text',async()=>{
 await assert.rejects(readStaffSheets({spreadsheetId:'test',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError('SYNTHETIC_PRIVATE_BODY');}})}),error=>error.message.includes('JSON') && !error.message.includes('SYNTHETIC_PRIVATE_BODY'));
});
test('null range and null JSON fail with an explicit safe schema error',async()=>{
 for(const json of [null,{valueRanges:Array(8).fill(null)}]) await assert.rejects(readStaffSheets({spreadsheetId:'test',accessToken:'FAKE_TEST_TOKEN',fetchImpl:async()=>({ok:true,json:async()=>json})}),/รูปแบบ|ชื่อชีต/);
});
