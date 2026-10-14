import test from 'node:test';
import assert from 'node:assert/strict';
import {MENU_SHEETS,rowsToObjects,readMenuSheet,validatePublicSummary} from '../smt2/landright-menu-source.mjs';

test('maps all eleven legacy menu datasets to private SMT2 tabs',()=>{
 assert.equal(Object.keys(MENU_SHEETS).length,11);
 assert.equal(MENU_SHEETS.section93,'มาตรา 93');
 assert.equal(MENU_SHEETS.docSearch,'ค้นหาเอกสาร');
});
test('preserves formatted values and does not overwrite duplicate headers',()=>{
 const result=rowsToObjects([['id','name','name','','__proto__'],['001','ชื่อแรก','ชื่อสอง','ignore','unsafe']]);
 assert.equal(result[0].id,'001');
 assert.equal(result[0].name,'ชื่อแรก');
 assert.equal(Object.hasOwn(result[0],'__proto__'),false);
});
test('rejects requests without OAuth token before making any network call',async()=>{
 let called=false;
 await assert.rejects(readMenuSheet({spreadsheetId:'test_id',menuId:'section93',fetchImpl:()=>{called=true;}}),/เข้าสู่ระบบ/);
 assert.equal(called,false);
});
test('requests formatted values using a read-only bearer token',async()=>{
 let url,options;
 const rows=await readMenuSheet({spreadsheetId:'test_id',menuId:'section93',accessToken:'TEST_TOKEN',fetchImpl:async(u,o)=>{
  url=u;options=o;return {ok:true,json:async()=>({values:[['id','name'],['001','ทดสอบ']]})};
 }});
 assert.match(url,/FORMATTED_VALUE/);
 assert.match(decodeURIComponent(url),/มาตรา 93/);
 assert.equal(options.headers.Authorization,'Bearer TEST_TOKEN');
 assert.equal(options.credentials,'omit');
 assert.equal(rows[0].name,'ทดสอบ');
});
test('public summaries contain counts only, not private records',()=>{
 const x=validatePublicSummary({menus:[{menuId:'section93',count:12,records:[{name:'private'}]},{menuId:'bad',count:2}]});
 assert.deepEqual(x,[{menuId:'section93',count:12}]);
});
