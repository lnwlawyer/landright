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
  // Browser workers reuse a cursor; compare both documents in the same hover state.
  await p.bringToFront();
  await p.mouse.move(-10,-10);
  await p.waitForTimeout(100);
 }
 const metrics=p=>p.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.getClientRects().length).map(e=>{
  const r=e.getBoundingClientRect(),css=getComputedStyle(e);
  const properties=['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','borderRadius','borderColor'];
  return {tag:e.tagName,id:e.id,class:e.getAttribute('class'),rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000),...Object.fromEntries(properties.map(key=>[key,css[key]]))};
 }));
 // Geometry (to 0.001 CSS px), colors and text metrics must be identical.
 const settle=async p=>{
  await p.bringToFront();await p.mouse.move(-10,-10);
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 };
 await settle(page);const actualMetrics=await metrics(page);
 await settle(old);const expectedMetrics=await metrics(old);
 expect(actualMetrics).toEqual(expectedMetrics);
 const expected=await old.screenshot({animations:'disabled'});
 await settle(page);
 const actual=await page.screenshot({animations:'disabled'});
 const a=PNG.sync.read(expected),b=PNG.sync.read(actual);
 expect([b.width,b.height]).toEqual([a.width,a.height]);
 let changed=0,maxDelta=0,first=null;const positions=[];
 for(let offset=0;offset<a.data.length;offset+=4){
  let delta=0;for(let channel=0;channel<4;channel++) delta=Math.max(delta,Math.abs(a.data[offset+channel]-b.data[offset+channel]));
  if(delta){changed++;maxDelta=Math.max(maxDelta,delta);const point=[offset/4%a.width,Math.floor(offset/4/a.width)];positions.push(point);first ||= point;}
 }
 if(changed){
  await testInfo.attach('tailwind3-reference',{body:expected,contentType:'image/png'});
  await testInfo.attach('tailwind4-current',{body:actual,contentType:'image/png'});
 }
 let target=null;
 if(first) target=await page.evaluate(([x,y])=>{const el=document.elementFromPoint(x,y);return el?{tag:el.tagName,id:el.id,class:el.className}:null;},first);
 const diagnostic=`changed=${changed}, maxChannelDelta=${maxDelta}, first=${JSON.stringify(first)}, target=${JSON.stringify(target)}`;
 // Chromium varied by 4 (hosted) or 17 (local) 1/255 pixels on this rounded border.
 // Restrict the allowance to those corners; all other image pixels must be identical.
 const edge=await page.locator('#smt2-admin-entry').evaluate(e=>{
  const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,radius:parseFloat(getComputedStyle(e).borderTopLeftRadius)};
 });
 const cornerOnly=positions.every(([x,y])=>x>=edge.left-1&&x<=edge.right+1&&y>=edge.top-1&&y<=edge.bottom+1&&Math.min(Math.abs(x-edge.left),Math.abs(edge.right-x))<=edge.radius+1&&Math.min(Math.abs(y-edge.top),Math.abs(edge.bottom-y))<=edge.radius+1);
 expect(maxDelta,diagnostic).toBeLessThanOrEqual(1);
 expect(changed,diagnostic).toBeLessThanOrEqual(32);
 expect(cornerOnly,diagnostic).toBe(true);
 await old.close();
});
