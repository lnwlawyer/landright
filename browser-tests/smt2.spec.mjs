test('Executive aging parses Thai dotted dates, numeric dates, and excludes invalid dates from SLA',async({page})=>{
 await setup(page); await login(page);
 const frame=page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]');
 const ages=await frame.locator('body').evaluate(()=>{
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
   const get=t=>Number(today.find(p=>p.type===t)?.value);
   const past=new Date(Date.UTC(get('year'),get('month')-1,get('day')-45));
   const buddhist=past.getUTCFullYear()+543;
   const thai=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][past.getUTCMonth()];
   const formatted=past.getUTCDate()+' '+thai+' '+buddhist;
   return {dotted:thaiAge(formatted),numeric:thaiAge(past.getUTCDate()+'/'+(past.getUTCMonth()+1)+'/'+buddhist),invalid:thaiAge('31 ก.พ. 2569')};
 });
 expect(ages).toEqual({dotted:45,numeric:45,invalid:null});
});
test('LandRight contains five SMT2 submenu links and they navigate the Executive views',async({page})=>{
 await setup(page); await login(page);
 const links=page.locator('[data-smt2-subview]');
 await expect(links).toHaveCount(5);
 const toggle=page.locator('[data-smt2-menu]');
 await expect(page.locator('#smt2-submenu')).toBeHidden();
 await toggle.click();
 await expect(page.locator('#smt2-submenu')).toBeVisible();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await toggle.click();
 await expect(page.locator('#smt2-submenu')).toBeHidden();
 await toggle.click();
 const frame=page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]');
 await expect(frame.locator('#view-dashboard')).toBeVisible();
 await page.locator('#mobile-menu-button').evaluate(button=>{if(getComputedStyle(button).display!=='none') button.click();});
 await page.locator('[data-smt2-subview="details"]').click();
 await expect(frame.locator('#view-details')).toBeVisible();
 await expect(page.locator('[data-smt2-subview="details"]')).toHaveAttribute('aria-current','page');
 await expect(frame.locator('#desktop-sidebar')).toBeHidden();
 await page.locator('#mobile-menu-button').evaluate(button=>{if(getComputedStyle(button).display!=='none') button.click();});
 await page.locator('[data-smt2-subview="analytics"]').click();
 await expect(frame.locator('#view-analytics')).toBeVisible();
});
import {test,expect} from '@playwright/test';
import {sheets, fakeResponse, setup, login} from './helpers.mjs';
test('anonymous users see login but no private API requests or records',async({page})=>{
 const requests=await setup(page); await page.goto('/index.html?view=smt2');
 await expect(page.locator('#smt2-content')).toBeVisible(); await expect(page.locator('[data-smt2-menu]')).toBeVisible();
 await expect(page.locator('#smt2-data')).toBeEmpty(); expect(requests).toHaveLength(0);
});
test('remember Google preference without storing access tokens or private records',async({page})=>{
 const requests=await setup(page);
 await login(page);
 await expect(page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]').locator('#last-sync-time')).toContainText('Google Sheets');
 const stored=await page.evaluate(()=>({remember:localStorage.getItem('landright-remember-google-v1'),local:Object.entries(localStorage),session:Object.entries(sessionStorage)}));
 expect(stored.remember).toBe('yes');
 expect(JSON.stringify(stored)).not.toContain('FAKE_BROWSER_TOKEN');
 expect(JSON.stringify(stored)).not.toContain('จังหวัดจำลอง');
 expect(requests.some(r=>new URL(r.url()).pathname.endsWith('/values:batchGet'))).toBe(true);
 await page.locator('#smt2-logout').click();
 await expect(page.locator('#smt2-data')).toBeEmpty();
 expect(await page.evaluate(()=>localStorage.getItem('landright-remember-google-v1'))).toBeNull();
});
test('login renders original Executive HTML using authenticated Sheets data, with no mock fallback',async({page})=>{
 page.on('console',m=>{if(m.type()==='error')console.log('SMT2 BROWSER ERROR:',m.text())});
 page.on('pageerror',e=>console.log('SMT2 PAGE ERROR:',e.message));
 const requests=await setup(page); await login(page);
 await expect(page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]').locator('#last-sync-time')).toContainText('Google Sheets');
 const req=requests.filter(r=>new URL(r.url()).pathname.endsWith('/values:batchGet'));
 expect(req).toHaveLength(1);
 expect(req[0].method()).toBe('GET');
 expect(new URL(req[0].url()).searchParams.getAll('ranges')).toHaveLength(8);
 expect(await req[0].headerValue('authorization')).toBe('Bearer FAKE_BROWSER_TOKEN');
 const frame=page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]');
 await expect(frame.locator('#desktop-sidebar')).toBeAttached();
 await expect(frame.locator('#last-sync-time')).toContainText('Google Sheets');
 expect(await page.locator('iframe[title="Executive Dashboard ข้อมูลงาน"]').evaluate(e=>e.contentWindow.ALL_CASES?.length)).toBeUndefined();
 await expect(page.locator('#smt2-data')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const storage=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));
 expect(storage).not.toContain('FAKE_BROWSER_TOKEN');
 await page.locator('#smt2-logout').click();
 await expect(page.locator('iframe[title="Executive Dashboard ข้อมูลงาน"]')).toHaveCount(0);
 await expect(page.locator('#smt2-data')).toBeEmpty();
 expect(await page.evaluate(()=>window.wasRevoked)).toBe(true);
});
for(const status of [401,403,404,429,500]) test(`API ${status} clears private data and shows error in SMT2`,async({page})=>{
 const requests=await setup(page,{status}); await login(page);
 const reason={401:'หมดอายุ',403:'ปฏิเสธ',404:'ไม่พบไฟล์',429:'จำกัด',500:'ไม่สำเร็จ'}[status];
 await expect(page.locator('#smt2-message')).toContainText(reason); expect(requests.length).toBeGreaterThanOrEqual(1); await expect(page.locator('#smt2-content')).toBeVisible();
 await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('#smt2-logout')).toBeVisible(); await expect(page.locator('#smt2-refresh')).toBeVisible();
});
for(const mode of ['popup','deny']) test(`OAuth ${mode} reports error and permits retry`,async({page})=>{
 const requests=await setup(page,{mode}); await login(page);
 await expect(page.locator('#smt2-message')).toContainText(mode==='popup'?'หน้าต่าง':'ไม่สำเร็จ');
 await expect(page.locator('#smt2-login')).toBeEnabled(); expect(requests).toHaveLength(0);
});
test('Google Identity unavailable keeps SMT2 open and explains failure',async({page})=>{
 await setup(page); await page.evaluate(()=>delete window.google); await login(page);
 await expect(page.locator('#smt2-message')).toContainText('Google Identity'); await expect(page.locator('#smt2-content')).toBeVisible();
});
test('logout during request prevents late private response restoring session',async({page})=>{
 await setup(page,{delay:400}); await login(page); await expect(page.locator('#smt2-logout')).toBeVisible();
 await page.locator('#smt2-logout').click(); await page.waitForTimeout(600);
 await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('[data-smt2-menu]')).toBeVisible();
});
test('expiry clears private DOM and requires a fresh login',async({page})=>{
 await setup(page); await page.clock.install(); await login(page); await expect(page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]').locator('#last-sync-time')).toContainText('Google Sheets');
 await page.clock.fastForward(3600001);
 await expect(page.locator('#smt2-message')).toContainText('หมดอายุ'); await expect(page.locator('#smt2-data')).toBeEmpty();
});
test('legacy LandRight menu and foreigner subtabs continue working',async({page})=>{
 await setup(page); for(const section of ['foreigners','religious','abandoned','users','settings','overview']){
  await page.evaluate(s=>window.showContent(s),section); await expect(page.locator('#'+section+'-content')).toBeVisible();
 }
 await page.evaluate(()=>window.showContent('foreigners'));
 for(const tab of ['section93','section96','boi','commercial']) {await page.evaluate(t=>window.showTab(t),tab);await expect(page.locator('#'+tab+'-tab')).toBeVisible();}
});

test('network failure during refresh removes previous records and session',async({page})=>{
 await setup(page); await login(page); await expect(page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]').locator('#last-sync-time')).toContainText('Google Sheets');
 await page.route('https://sheets.googleapis.com/**',route=>route.abort('failed'));
 await page.locator('#smt2-refresh').click(); await expect(page.locator('#smt2-message')).toContainText('เครือข่าย');
 await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('#smt2-refresh')).toBeVisible();
});
test('incomplete Sheets response never renders partial private data',async({page})=>{
 await setup(page); await page.route('https://sheets.googleapis.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({valueRanges:fakeResponse().valueRanges.slice(0,7)})}));
 await login(page); await expect(page.locator('#smt2-message')).toContainText('ไม่ครบ'); await expect(page.locator('#smt2-data')).toBeEmpty();
});
test('missing expected columns show an explicit warning',async({page})=>{
 await setup(page); await page.route('https://sheets.googleapis.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({valueRanges:sheets.map(s=>({range:`'${s}'!A1:A2`,values:[['เรื่อง'],['ตัวอย่างจำลอง']]}))})}));
 await login(page); await expect(page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]').locator('#last-sync-time')).toContainText('Google Sheets');
});
test('invalid configuration does not initiate OAuth or call private API',async({page})=>{
 const requests=await setup(page); await page.goto('/index.html?view=smt2');
 // Reload with an invalid config file, as the module captures configuration at startup.
 await page.route('**/smt2-config.example.js',route=>route.fulfill({contentType:'text/javascript',body:'window.LANDRIGHT_SMT2_CONFIG={};'}));
 await page.reload(); await login(page); await expect(page.locator('#smt2-message')).toContainText('ตั้งค่า'); expect(requests).toHaveLength(0);
});
test('page exit cancels a pending OAuth response instead of restoring a session',async({page})=>{
 const requests=await setup(page,{mode:'hold'}); await login(page);
 await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.finishOAuth();});
 await expect(page.locator('#smt2-data')).toBeEmpty(); expect(requests).toHaveLength(0); await expect(page.locator('[data-smt2-menu]')).toBeVisible();
});
test('legacy LandRight datasets stay private until Google authorization',async({page})=>{
 const requests=await setup(page,{legacyData:true});
 await page.goto('/index.html');
 // Legacy menu loaders now wait for the shared OAuth session instead of public CSV endpoints.
 await page.waitForTimeout(100);
 expect(requests).toHaveLength(0);
 await expect(page.locator('#smt2-data')).toBeEmpty();
});

test('mobile menu opens and closes with Escape after the stylesheet migration',async({page})=>{
 await setup(page);
 if(page.viewportSize().width>=1024){await expect(page.locator('#sidebar')).toBeVisible();return;}
 await page.locator('#mobile-menu-button').click();
 await expect(page.locator('#mobile-overlay')).toBeVisible();
 await page.keyboard.press('Escape'); await expect(page.locator('#mobile-overlay')).toBeHidden();
});
