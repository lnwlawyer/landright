import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
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
 const a=PNG.sync.read(expected),b=PNG.sync.read(actual);
 expect([b.width,b.height]).toEqual([a.width,a.height]);
 let changed=0,maxDelta=0,first=null;
 for(let offset=0;offset<a.data.length;offset+=4){
  let delta=0;for(let channel=0;channel<4;channel++) delta=Math.max(delta,Math.abs(a.data[offset+channel]-b.data[offset+channel]));
  if(delta){changed++;maxDelta=Math.max(maxDelta,delta);first ||= [offset/4%a.width,Math.floor(offset/4/a.width)];}
 }
 if(changed){
  await testInfo.attach('tailwind3-reference',{body:expected,contentType:'image/png'});
  await testInfo.attach('tailwind4-current',{body:actual,contentType:'image/png'});
 }
 let target=null;
 if(first) target=await page.evaluate(([x,y])=>{const el=document.elementFromPoint(x,y);return el?{tag:el.tagName,id:el.id,class:el.className}:null;},first);
 expect(changed,`Rendered pixels must match; changed=${changed}, maxChannelDelta=${maxDelta}, first=${JSON.stringify(first)}, target=${JSON.stringify(target)}`).toBe(0);
 await old.close();
});
