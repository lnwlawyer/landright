import {test,expect} from '@playwright/test';
const sheets=['การะเกด','ชยาน์ขวัญ','ฉัตรพร','ภทรพงค์','สกุลวรรณ','ปิยะพงษ์','เทอดพงศ์','โสภา'];
const scope='https://www.googleapis.com/auth/spreadsheets.readonly';
const fakeResponse=()=>({valueRanges:sheets.map((s,i)=>({range:`'${s}'!A1:E62`,values:[['จังหวัด','ชื่อเรื่อง','เลขที่รับ','ผู้รับผิดชอบ','สถานะ'],...Array.from({length:61},(_,n)=>['จังหวัดจำลอง',n===0?'<img src=x onerror="window.xss=true">':`เรื่องจำลอง ${i}-${n}`,'TEST-'+n,'เจ้าหน้าที่จำลอง',n%2?'เสร็จแล้ว':'รอ'])]}))});
async function setup(page,{status=200,mode='success',delay=0,expires=3600}={}) {
 const requests=[];
 await page.route('https://**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith('https://sheets.googleapis.com/')){
   requests.push(route.request()); if(delay) await new Promise(r=>setTimeout(r,delay));
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?fakeResponse():{error:{message:'not authorized'}})}); return;
  }
  if(url.startsWith('https://accounts.google.com/gsi/')){
   await route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{oauth2:{initTokenClient:opts=>({requestAccessToken:()=>{window.oauthOptions=opts;${mode==='popup'?'opts.error_callback({type:"popup_closed"})':mode==='deny'?'opts.callback({error:"access_denied"})':mode==='hold'?'window.finishOAuth=()=>opts.callback({access_token:"FAKE_BROWSER_TOKEN",expires_in:'+expires+',scope:"'+scope+'"})':'opts.callback({access_token:"FAKE_BROWSER_TOKEN",expires_in:'+expires+',scope:"'+scope+'"})'}}}),revoke:()=>{window.wasRevoked=true}}}};`}); return;
  }
  // Never contact production data or other third parties in synthetic acceptance tests.
  if(url.includes('docs.google.com/')) await route.fulfill({body:'name,province\n',contentType:'text/csv'});
  else if(url.includes('chart.js')) await route.fulfill({contentType:'text/javascript',body:'window.Chart=class {constructor(){this.data={datasets:[]}} destroy(){} resize(){} update(){}};'});
  else await route.fulfill({body:'',contentType:'text/plain'});
 });
 await page.goto('/index.html'); await expect(page.locator('#smt2-login')).toBeAttached();
 return requests;
}
async function login(page) {await page.locator('#smt2-admin-entry').click();}
test('anonymous users see login but no private API requests or records',async({page})=>{
 const requests=await setup(page); await page.goto('/index.html?view=smt2');
 await expect(page.locator('#smt2-content')).toBeVisible(); await expect(page.locator('[data-smt2-menu]')).toBeHidden();
 await expect(page.locator('#smt2-data')).toBeEmpty(); expect(requests).toHaveLength(0);
});
test('login reads all tabs, filters, dashboard, pagination, safe HTML and logout',async({page})=>{
 const requests=await setup(page); await login(page);
 await expect(page.locator('#smt2-count')).toContainText('488'); expect(requests).toHaveLength(1);
 const request=requests[0]; expect(request.method()).toBe('GET'); expect(new URL(request.url()).searchParams.getAll('ranges')).toHaveLength(8);
 expect(await request.headerValue('authorization')).toBe('Bearer FAKE_BROWSER_TOKEN');
 await expect(page.locator('#smt2-results tbody tr')).toHaveCount(50);
 await expect(page.locator('#smt2-results img')).toHaveCount(0); expect(await page.evaluate(()=>window.xss)).toBeUndefined();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 expect(await page.locator('#smt2-results').evaluate(e=>e.scrollWidth>e.clientWidth || innerWidth>700)).toBe(true);
 await page.locator('#smt2-next').click(); await expect(page.locator('#smt2-page')).toContainText('2 / 10');
 await page.locator('#smt2-sheet').selectOption(sheets[0]); await expect(page.locator('#smt2-count')).toContainText('61');
 await expect(page.locator('#smt2-page')).toContainText('1 / 2');
 await page.locator('#smt2-status').selectOption('เสร็จแล้ว'); await expect(page.locator('#smt2-count')).toContainText('30');
 await expect(page.locator('#smt2-dashboard')).toContainText('30');
 await page.locator('#smt2-search').fill('ไม่มีเรื่องนี้'); await expect(page.locator('#smt2-results')).toContainText('ไม่พบรายการ');
 await expect(page.locator('#smt2-next')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 const storage=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)])); expect(storage).not.toContain('FAKE_BROWSER_TOKEN');
 await page.locator('#smt2-logout').click(); await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('[data-smt2-menu]')).toBeHidden();
 expect(await page.evaluate(()=>window.wasRevoked)).toBe(true);
});
for(const status of [401,403,404,429,500]) test(`API ${status} clears private data and shows error in SMT2`,async({page})=>{
 const requests=await setup(page,{status}); await login(page);
 const reason={401:'หมดอายุ',403:'ปฏิเสธ',404:'ไม่พบไฟล์',429:'จำกัด',500:'ไม่สำเร็จ'}[status];
 await expect(page.locator('#smt2-message')).toContainText(reason); expect(requests).toHaveLength(1); await expect(page.locator('#smt2-content')).toBeVisible();
 await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('#smt2-login')).toBeVisible(); await expect(page.locator('[data-smt2-menu]')).toBeHidden();
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
 await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('[data-smt2-menu]')).toBeHidden();
});
test('expiry clears private DOM and requires a fresh login',async({page})=>{
 await setup(page,{expires:1}); await login(page); await expect(page.locator('#smt2-count')).toContainText('488');
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
 await setup(page); await login(page); await expect(page.locator('#smt2-count')).toContainText('488');
 await page.route('https://sheets.googleapis.com/**',route=>route.abort('failed'));
 await page.locator('#smt2-refresh').click(); await expect(page.locator('#smt2-message')).toContainText('เครือข่าย');
 await expect(page.locator('#smt2-data')).toBeEmpty(); await expect(page.locator('[data-smt2-menu]')).toBeHidden();
});
test('incomplete Sheets response never renders partial private data',async({page})=>{
 await setup(page); await page.route('https://sheets.googleapis.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({valueRanges:fakeResponse().valueRanges.slice(0,7)})}));
 await login(page); await expect(page.locator('#smt2-message')).toContainText('ไม่ครบ'); await expect(page.locator('#smt2-data')).toBeEmpty();
});
test('missing expected columns show an explicit warning',async({page})=>{
 await setup(page); await page.route('https://sheets.googleapis.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({valueRanges:sheets.map(s=>({range:`'${s}'!A1:A2`,values:[['เรื่อง'],['ตัวอย่างจำลอง']]}))})}));
 await login(page); await expect(page.locator('#smt2-warning')).toContainText('ขาดคอลัมน์'); await expect(page.locator('#smt2-count')).toContainText('8');
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
 await expect(page.locator('#smt2-data')).toBeEmpty(); expect(requests).toHaveLength(0); await expect(page.locator('[data-smt2-menu]')).toBeHidden();
});
