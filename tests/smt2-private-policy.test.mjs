import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEmail,permittedRole,allowedSheet,validPage,projectColumns,projectRows,MAX_LIMIT} from '../smt2/backend/private-policy.mjs';

test('identity is normalized but never inferred for anonymous callers',()=>{
 assert.equal(normalizeEmail(' Reader@Example.invalid '),'reader@example.invalid');
 for(const bad of ['',null,'not-an-email',' user @example.invalid','reader@']) assert.equal(normalizeEmail(bad),'');
});
test('readers can read, editors can read and write, unknown callers are denied',()=>{
 const readers='reader@example.invalid';
 const editors='editor@example.invalid';
 assert.equal(permittedRole('reader@example.invalid','reader',readers,editors),true);
 assert.equal(permittedRole('reader@example.invalid','editor',readers,editors),false);
 assert.equal(permittedRole('editor@example.invalid','reader',readers,editors),true);
 assert.equal(permittedRole('editor@example.invalid','editor',readers,editors),true);
 assert.equal(permittedRole('outsider@example.invalid','reader',readers,editors),false);
 assert.equal(permittedRole('','reader',readers,editors),false);
 assert.equal(permittedRole('editor@example.invalid','admin',readers,editors),false);
 assert.equal(permittedRole('reader@example.invalid','reader','',editors),false);
});
test('sheet restrictions apply even when excluded names appear in enumerated list',()=>{
 const names=['งานทดสอบ','Config','OrgChart','กลุ่มต่างด้าว','กลุ่มศาสนา'];
 assert.equal(allowedSheet('งานทดสอบ',names),true);
 for(const name of ['Config','OrgChart','กลุ่มต่างด้าว','กลุ่มศาสนา','งานทดสอบ ','ไม่มีจริง','']) assert.equal(allowedSheet(name,names),false);
});
test('pagination rejects invalid, huge, negative and fractional values',()=>{
 assert.equal(validPage(1,10),true);
 assert.equal(validPage(10000,MAX_LIMIT),true);
 for(const [p,l] of [[0,10],[1,0],[-1,10],[1,51],[10001,10],[1.5,10],[1,NaN],[1,'10'],[Infinity,10]]) assert.equal(validPage(p,l),false);
});
test('only explicitly configured columns are projected, not private fields',()=>{
 const headers=['เลขรับ','สถานะ','ข้อมูลส่วนบุคคล'];
 const projection=projectColumns(headers,'เลขรับ,สถานะ');
 assert.deepEqual(projection.columns,['เลขรับ','สถานะ']);
 assert.deepEqual(projectRows([['R001','รอดำเนินการ','SECRET-A'],['R002','เสร็จ','SECRET-B']],projection.positions),[['R001','รอดำเนินการ'],['R002','เสร็จ']]);
 for(const config of ['', 'ไม่มีจริง', 'เลขรับ,เลขรับ']) assert.throws(()=>projectColumns(headers,config),/COLUMN_NOT_ALLOWED/);
 assert.throws(()=>projectColumns(['เลขรับ','เลขรับ'],'เลขรับ'),/COLUMN_NOT_ALLOWED/);
});
test('case-level data must never appear in public GitHub Pages assets',()=>{
 assert.equal(permittedRole('','reader','reader@example.invalid',''),false);
});
