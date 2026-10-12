import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../smt2/backend/live-sheets-adapter.reference.gs',import.meta.url),'utf8');
function sandbox(email='reader@example.invalid') {
 const headers=['ลำดับ','จังหวัด','เรื่อง','หมายเลขเอกสารสิทธิ ผู้ขอ/ผู้ร้อง','สถานะปัจจุบัน'];
 const rows=[headers,['1','กรุงเทพมหานคร','ทดสอบ','PRIVATE','อยู่ระหว่างดำเนินการ']];
 const props={
  SMT2_SPREADSHEET_ID:'fictional-id',
  SMT2_READER_EMAILS:'reader@example.invalid',
  SMT2_EDITOR_EMAILS:'editor@example.invalid',
  SMT2_ALLOWED_SHEETS:'การะเกด',
  SMT2_READER_COLUMNS:'ลำดับ,จังหวัด,สถานะปัจจุบัน'
 };
 const sheet={
  getLastColumn:()=>headers.length,
  getLastRow:()=>rows.length,
  getRange:(r,c,n,w)=>({getDisplayValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w))})
 };
 const ctx={
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]??null})},
  Session:{getActiveUser:()=>({getEmail:()=>email})},
  SpreadsheetApp:{openById:id=>{assert.equal(id,'fictional-id');return {getSheetByName:name=>name==='การะเกด'?sheet:null};}},
  Number,Set,String,Array,Error
 };
 vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:1000});
 return {ctx,props,rows,headers};
}
test('restricted adapter never returns private fields',()=>{
 const {ctx}=sandbox();
 const result=ctx.smt2LiveReadPage({sheetName:'การะเกด'});
 assert.deepEqual(Array.from(result.columns),['ลำดับ','จังหวัด','สถานะปัจจุบัน']);
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 assert.equal(result.totalRows,1);
});
test('anonymous and unauthorized principals cannot list, read or probe health',()=>{
 for(const email of ['','unknown@example.invalid']) {
  const {ctx}=sandbox(email);
  for(const fn of ['smt2LiveListSheets','smt2LiveHealth']) assert.throws(()=>ctx[fn](),/NOT_AUTHORIZED/);
  assert.throws(()=>ctx.smt2LiveReadPage({sheetName:'การะเกด'}),/NOT_AUTHORIZED/);
 }
});
test('reader cannot select excluded sheets or arbitrary names',()=>{
 const {ctx,props}=sandbox();
 for(const name of ['Config','OrgChart','กลุ่มต่างด้าว','กลุ่มศาสนา','ไม่รู้จัก']) assert.throws(()=>ctx.smt2LiveReadPage({sheetName:name}),/SHEET_NOT_ALLOWED/);
 props.SMT2_ALLOWED_SHEETS='การะเกด,Config';
 assert.throws(()=>ctx.smt2LiveListSheets(),/INVALID_CONFIGURATION/);
});
test('bad pagination, projection and missing config fail closed',()=>{
 const {ctx,props}=sandbox();
 for(const [page,limit] of [[0,10],[1,51],[1.2,10],[1,'10'],[10001,1]]) assert.throws(()=>ctx.smt2LiveReadPage({sheetName:'การะเกด',page,limit}),/INVALID_/);
 props.SMT2_READER_COLUMNS='จังหวัด,จังหวัด';
 assert.throws(()=>ctx.smt2LiveReadPage({sheetName:'การะเกด'}),/INVALID_CONFIGURATION/);
 props.SMT2_READER_COLUMNS='ชื่อผู้ร้อง';
 assert.throws(()=>ctx.smt2LiveReadPage({sheetName:'การะเกด'}),/COLUMN_NOT_ALLOWED/);
 delete props.SMT2_SPREADSHEET_ID;
 assert.throws(()=>ctx.smt2LiveReadPage({sheetName:'การะเกด'}),/CONFIG_REQUIRED/);
});
test('configured editor can read and only permitted sheet is listed',()=>{
 const {ctx}=sandbox('editor@example.invalid');
 assert.deepEqual(Array.from(ctx.smt2LiveListSheets()),['การะเกด']);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.smt2LiveHealth())),{ok:true,configuredSheets:1});
});
