import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8012';
test('isolated UAT uses synthetic records and sends no external requests',async({page})=>{
 const external=[];page.on('request',r=>{if(new URL(r.url()).origin!==base) external.push(r.url());});
 await page.goto(base+'/index.html?view=smt2');
 await expect(page.locator('#uat-banner')).toContainText('ไม่ใช่ Google OAuth จริง');
 await expect(page.locator('#smt2-data')).toBeEmpty();
 await page.locator('#smt2-admin-entry').click();
 await expect(page.frameLocator('iframe[title="Executive Dashboard ข้อมูลงาน"]').locator('#last-sync-time')).toContainText('Google Sheets');
 await page.locator('#smt2-logout').click();await expect(page.locator('#smt2-data')).toBeEmpty();
 expect(external).toEqual([]);
});
test('synthetic denied account clears data and displays denial',async({page})=>{
 await page.goto(base+'/index.html?view=smt2&uat-role=denied');await page.locator('#smt2-admin-entry').click();
 await expect(page.locator('#smt2-message')).toContainText('ปฏิเสธ');await expect(page.locator('#smt2-data')).toBeEmpty();
});
test('UAT server serves only public application assets without caching',async({request})=>{
 const page=await request.get(base+'/index.html');expect(page.status()).toBe(200);
 expect(page.headers()['cache-control']).toBe('no-store');expect(page.headers()['content-security-policy']).toContain("connect-src 'self';");
 for(const path of ['/.git/config','/package-lock.json','/docs/','/uat/','/../README.md','/%2e%2e/README.md']){
  const response=await request.get(base+path);expect(response.status()).toBe(404);
 }
 // Python normalizes a leading double slash; it must still serve only the allowed asset.
 expect((await request.get(base+'//assets/chart.js')).status()).toBe(200);
 expect((await request.get(base+'/index.html',{headers:{Host:'untrusted.example:8012'}})).status()).toBe(403);
 expect((await request.post(base+'/index.html',{data:'synthetic'})).status()).toBe(405);
});
