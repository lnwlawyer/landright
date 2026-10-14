import {MENU_SHEETS,readMenuSheet,SHEETS_READONLY_SCOPE} from './smt2/landright-menu-source.mjs';
const config=window.LANDRIGHT_SMT2_CONFIG||{};
const sectionGroups={
  foreigners:['section93','section96','boi','commercial'],
  religious:['temple','mosque','christian','catholic'],
  abandoned:['abandoned'],
  users:['securities','docSearch']
};
const sectionNames={foreigners:'คนต่างด้าว',religious:'นิติบุคคลเพื่อการศาสนา',abandoned:'ที่ดินทอดทิ้ง',users:'ฝ่ายควบคุมทะเบียนที่ดิน'};
const panels=new Map();
let accessToken='',expiresAt=0,oauthClient=null,activeMenu=null,requestId=0,controller=null;
const element=(tag,attrs={},text='')=>{const el=document.createElement(tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,value));el.textContent=text;return el;};
const status=(panel,text)=>{panel.querySelector('[data-source-status]').textContent=text;};
function resetAuth(){
 accessToken='';expiresAt=0;requestId++;controller?.abort();
 for(const panel of panels.values()) {panel.querySelector('[data-source-results]').replaceChildren();status(panel,'เฉพาะเจ้าหน้าที่ที่มีสิทธิ์ Google Sheets สามารถอ่านข้อมูลรายเรื่องได้');}
}
async function load(menuId,panel){
 activeMenu=menuId;const seq=++requestId;controller?.abort();controller=new AbortController();
 const area=panel.querySelector('[data-source-results]');area.replaceChildren();status(panel,'กำลังอ่านข้อมูลจาก Google Sheets...');
 try {
  const rows=await readMenuSheet({spreadsheetId:config.spreadsheetId,accessToken,menuId,signal:controller.signal});
  if(seq!==requestId)return;
  status(panel,'แท็บ '+MENU_SHEETS[menuId]+' — '+rows.length.toLocaleString('th-TH')+' รายการ');
  if(!rows.length){area.append(element('p',{},'ไม่พบข้อมูลในแท็บนี้'));return;}
  const headers=Object.keys(rows[0]).slice(0,24);
  const table=element('table',{'class':'smt2-unified-table'}),head=element('thead'),hrow=element('tr');
  headers.forEach(h=>hrow.append(element('th',{'scope':'col'},h)));head.append(hrow);table.append(head);
  const body=element('tbody');rows.slice(0,200).forEach(row=>{const tr=element('tr');headers.forEach(h=>tr.append(element('td',{},row[h]??'')));body.append(tr);});table.append(body);
  const wrapper=element('div',{'class':'smt2-unified-scroll'});wrapper.append(table);area.append(wrapper);
  if(rows.length>200)area.prepend(element('p',{},'แสดง 200 รายการแรกจาก '+rows.length.toLocaleString('th-TH')+' รายการ'));
 } catch(error) {
  if(seq!==requestId||error.name==='AbortError')return;
  status(panel,error.message||'ไม่สามารถอ่าน Google Sheets ได้');
  if(/หมดอายุ|ไม่มีสิทธิ์/.test(error.message||''))resetAuth();
 }
}
function requestLogin(menuId,panel){
 if(accessToken&&Date.now()<expiresAt-60000){load(menuId,panel);return;}
 if(!config.oauthClientId||!config.spreadsheetId){status(panel,'ยังไม่ได้ตั้งค่า Google OAuth');return;}
 if(!window.google?.accounts?.oauth2){status(panel,'โหลดบริการเข้าสู่ระบบ Google ไม่สำเร็จ โปรดลองใหม่');return;}
 if(!oauthClient)oauthClient=window.google.accounts.oauth2.initTokenClient({
  client_id:config.oauthClientId,scope:SHEETS_READONLY_SCOPE,
  callback:result=>{
   const target=panels.get(requestLogin.pendingSection);
   if(result?.error||!result?.access_token){if(target)status(target,'เข้าสู่ระบบ Google ไม่สำเร็จ');return;}
   accessToken=result.access_token;expiresAt=Date.now()+Math.max(60,Number(result.expires_in)||3500)*1000;
   if(target)load(requestLogin.pendingMenu,target);
  }
 });
 requestLogin.pendingMenu=menuId;requestLogin.pendingSection=panel.dataset.sourceSection;
 oauthClient.requestAccessToken({prompt:'consent'});
}
function renderPanel(section){
 const original=document.getElementById(section+'-content');if(!original)return;
 const panel=element('div',{'class':'smt2-unified-panel','data-source-section':section});
 panel.append(element('h2',{},sectionNames[section]));
 panel.append(element('p',{},'ข้อมูลสาธารณะ: ยังไม่มีชุดสรุปที่ผ่านการอนุมัติให้เผยแพร่ จึงไม่แสดงข้อมูลรายเรื่องของไฟล์ SMT2'));
 panel.append(element('p',{},'เจ้าหน้าที่ที่ได้รับสิทธิ์ Google Sheets สามารถเข้าสู่ระบบเพื่อดูข้อมูลจากแท็บที่เกี่ยวข้องได้'));
 const nav=element('div',{'class':'smt2-unified-nav'});
 for(const id of sectionGroups[section]){
  const button=element('button',{'type':'button'},MENU_SHEETS[id]);
  button.addEventListener('click',()=>requestLogin(id,panel));nav.append(button);
 }
 panel.append(nav);
 const logout=element('button',{'type':'button','class':'smt2-unified-logout'},'ออกจากระบบเมนูข้อมูล');
 logout.addEventListener('click',()=>{const old=accessToken;resetAuth();if(old)try{window.google?.accounts?.oauth2.revoke(old,()=>{});}catch{}});
 panel.append(logout);
 panel.append(element('p',{'role':'status','aria-live':'polite','data-source-status':''},'เฉพาะเจ้าหน้าที่ที่มีสิทธิ์ Google Sheets สามารถอ่านข้อมูลรายเรื่องได้'));
 panel.append(element('div',{'data-source-results':''}));
 original.replaceChildren(panel);panels.set(section,panel);
}
function init(){
 Object.keys(sectionGroups).forEach(renderPanel);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&accessToken&&Date.now()>expiresAt)resetAuth();});
 window.addEventListener('pagehide',resetAuth);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
