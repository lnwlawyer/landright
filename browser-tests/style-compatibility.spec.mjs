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
 // Exact computed geometry and CSS values above are the compatibility contract.
 // Pixel-perfect screenshot diffs are intentionally omitted because hosted Chromium rasterization
 // varies across runner images even when computed styles are identical.
 await old.close();
});
