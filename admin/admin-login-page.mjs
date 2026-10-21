import {loadFirebaseAdminClient} from './firebase-client-gate.mjs';
const API='https://landright-admin-api.boonprasertlawyer.workers.dev';
const login=document.querySelector('#login'),logout=document.querySelector('#logout'),status=document.querySelector('#status'),uid=document.querySelector('#uid');
let client;
function busy(value){login.disabled=value;logout.disabled=value;}
function render(result){
 const authorized=result.authorized===true;
 logout.hidden=false;
 uid.hidden=!result.uid;
 uid.textContent=result.uid?'Firebase UID: '+result.uid:'';
 status.textContent=authorized?'ยืนยันสิทธิ์ Admin สำเร็จ':result.reason==='not_admin'?'ไม่มีสิทธิ์ Admin (HTTP 403) — ตรวจสอบ Firestore Role และ UID':result.reason==='invalid_token'?'Firebase Token ไม่ผ่านการตรวจสอบ (HTTP 401)':result.reason==='backend_unavailable'?'Admin API ไม่พร้อมใช้งาน (HTTP 503) — ตรวจสอบ Google API และ Cloudflare Worker':result.reason==='signed_out'?'ยังไม่ได้เข้าสู่ระบบ':'ไม่สามารถยืนยันสิทธิ์ Admin ได้ (HTTP '+(result.httpStatus||'ไม่ทราบ')+')';
}
login.addEventListener('click',async()=>{
 busy(true);status.textContent='กำลังตรวจสอบบัญชี...';
 try{client??=await loadFirebaseAdminClient({apiBaseUrl:API});render(await client.login());}
 catch(e){status.textContent='เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ Authorized domains และการตั้งค่า Firebase';console.error('Admin login failed',e?.name);}
 finally{busy(false);}
});
logout.addEventListener('click',async()=>{
 busy(true);try{if(client)await client.logout();logout.hidden=true;uid.hidden=true;status.textContent='ออกจากระบบแล้ว';}
 catch{status.textContent='ออกจากระบบไม่สำเร็จ';}finally{busy(false);}
});
