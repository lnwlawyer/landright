import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup,login} from './helpers.mjs';
const baseline=readFileSync(new URL('./fixtures/tailwind3-baseline.css',import.meta.url));
const views=[['overview'],['foreigners','section93'],['foreigners','section96'],['foreigners','boi'],['foreigners','commercial'],['religious','temple'],['religious','mosque'],['religious','christian'],['religious','catholic'],['abandoned'],['users'],['settings'],['smt2'],['mobile-menu']];
for(const [section,tab] of views) test(`Tailwind migration preserves ${section}${tab?':'+tab:''}`,async({page,context},testInfo)=>{
 const old=await context.newPage();
 await old.route('**/assets/landright.css',r=>r.fulfill({contentType:'text/css',body:baseline}));
 for(const p of [old,page]){
  await p.emulateMedia({reducedMotion:'reduce'});
  await setup(p);
  if(section==='mobile-menu'){await p.evaluate(()=>document.getElementById('mobile-menu-button').click());}
  else if(section==='smt2'){await login(p);await expect(p.locator('#smt2-count')).toContainText('488');}
  else {
   await p.evaluate(s=>window.showContent(s),section);
   if(tab){await p.evaluate(([s,t])=>s==='foreigners'?window.showTab(t):window.showReligiousTab(t),[section,tab]);}
  }
  await p.waitForTimeout(100);
 }
 const expected=await old.screenshot({animations:'disabled'});
 const actual=await page.screenshot({animations:'disabled'});
 if(!actual.equals(expected)){
  await testInfo.attach('tailwind3-reference',{body:expected,contentType:'image/png'});
  await testInfo.attach('tailwind4-current',{body:actual,contentType:'image/png'});
 }
 expect(actual.equals(expected),'Rendered pixels must match the pre-migration stylesheet').toBe(true);
 await old.close();
});
