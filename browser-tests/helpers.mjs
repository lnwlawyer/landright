import {expect} from '@playwright/test';
export const sheets=['การะเกด','ชยาน์ขวัญ','ฉัตรพร','ภทรพงค์','สกุลวรรณ','ปิยะพงษ์','เทอดพงศ์','โสภา'];
export const scope='https://www.googleapis.com/auth/spreadsheets.readonly';
export const fakeResponse=()=>({valueRanges:sheets.map((s,i)=>({range:`'${s}'!A1:E62`,values:[['จังหวัด','ชื่อเรื่อง','เลขที่รับ','ผู้รับผิดชอบ','สถานะ'],...Array.from({length:61},(_,n)=>['จังหวัดจำลอง',n===0?'<img src=x onerror="window.xss=true">':`เรื่องจำลอง ${i}-${n}`,'TEST-'+n,'เจ้าหน้าที่จำลอง',n%2?'เสร็จแล้ว':'รอ'])]}))});
export async function setup(page,{status=200,mode='success',delay=0,expires=3600,legacyData=false}={}) {
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
  if(url.includes('docs.google.com/')) await route.fulfill({body:legacyData ?
   'id,client_name,name,province,nationality,plot_count,area_rai,land_use_type,status,copy_count,temple_name,mosque_name,foundation_name,church_name,note\nTEST-ONLY,ผู้ใช้จำลอง,ชื่อจำลอง,จังหวัดจำลอง,สัญชาติจำลอง,2,1,ประเภทจำลอง,รอดำเนินการ,3,วัดจำลอง,มัสยิดจำลอง,มูลนิธิจำลอง,โบสถ์จำลอง,ข้อมูลสังเคราะห์\n' : 'name,province\n',contentType:'text/csv'});
  else if(url.includes('chart.js')) await route.fulfill({contentType:'text/javascript',body:'window.Chart=class {constructor(){this.data={datasets:[]}} destroy(){} resize(){} update(){}};'});
  else await route.fulfill({body:'',contentType:'text/plain'});
 });
 await page.goto('/index.html'); await expect(page.locator('#smt2-login')).toBeAttached();
 return requests;
}
export async function login(page) {await page.locator('#smt2-admin-entry').click();}
