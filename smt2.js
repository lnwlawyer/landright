/* Tokens and private records live only in this page's memory. Google enforces file access. */
import {READONLY_SCOPE, readStaffSheets, filterRecords, summarize} from './smt2/sheets-reader.mjs';
const cfg = window.LANDRIGHT_SMT2_CONFIG || {};
const $ = id => document.getElementById(id);
const root = $('smt2-content');
const menu = document.querySelector('[data-smt2-menu]');
// The token remains private to this module; other LandRight menus receive only
// an authenticated read function, never the bearer token.
import {readMenuSheet} from './smt2/landright-menu-source.mjs';
window.landrightAuthIsReady = () => Boolean(token && Date.now() < expiresAt);
window.landrightReadMenu = async menuId => {
  if (!token || Date.now() >= expiresAt) throw new Error('กรุณาเข้าสู่ระบบ Google');
  return readMenuSheet({spreadsheetId:cfg.spreadsheetId,accessToken:token,menuId});
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token = null, expiresAt = 0, tokenClient = null, records = [], generation = 0, expiryTimer, activeRequest, pending = false;
let accountEmail = null;
const SMT2_GROUPS = Object.freeze({
  'การะเกด':'ฝ่ายตรวจสอบ','ชยาน์ขวัญ':'ฝ่ายตรวจสอบ','ฉัตรพร':'ฝ่ายตรวจสอบ',
  'ปิยะพงษ์':'กลุ่มต่างด้าว','โสภา':'กลุ่มต่างด้าว','เทอดพงศ์':'กลุ่มต่างด้าว',
  'สกุลวรรณ':'กลุ่มศาสนา','ภทรพงค์':'กลุ่มศาสนา'
});
const SMT2_GROUP_ORDER = ['กลุ่มต่างด้าว','กลุ่มศาสนา','ฝ่ายตรวจสอบ'];
const groupForRecord = record => SMT2_GROUPS[record.sheet] || 'ไม่ระบุกลุ่ม';
let smt2Charts = [];
function destroySmt2Charts() { for (const chart of smt2Charts) chart.destroy(); smt2Charts=[]; }
const smt2ValueLabels = {
  id:'smt2ValueLabels',
  afterDatasetsDraw(chart) {
    const {ctx}=chart;
    ctx.save();
    ctx.fillStyle='#1e293b';
    ctx.font='600 12px sans-serif';
    ctx.textAlign='left';
    ctx.textBaseline='middle';
    chart.data.datasets.forEach((dataset, datasetIndex)=>{
      const meta=chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((element,index)=>{
        const value=Number(dataset.data[index]);
        if(!Number.isFinite(value))return;
        const x=Math.min(element.x+7,chart.chartArea.right+4);
        ctx.fillText(value.toLocaleString('th-TH'),x,element.y);
      });
    });
    ctx.restore();
  }
};
// Central status palette: keep colors stable across filters and staff groups.
const SMT2_STATUS_COLORS = Object.freeze({
  'เสร็จแล้ว':'#15803d',
  'รอผลจังหวัด/หน่วยงานอื่น':'#d97706',
  'ระหว่างพิจารณาของเจ้าหน้าที่':'#2563eb',
  'ตรวจร่าง':'#7c3aed',
  'เสนอรองนาม':'#0891b2',
  'ไม่ระบุ':'#64748b',
  'ไม่ระบุสถานะ':'#64748b'
});
function smt2StatusColor(value) {
  const name=String(value??'').trim().replace(/\\s+/g,' ');
  if(Object.prototype.hasOwnProperty.call(SMT2_STATUS_COLORS,name)) return SMT2_STATUS_COLORS[name];
  // Deterministic fallback for future statuses, without relying on sort order.
  const palette=['#be185d','#0f766e','#a16207','#4338ca','#b45309','#0369a1','#7e22ce'];
  let hash=0;
  for(const char of name) hash=(Math.imul(hash,31)+char.codePointAt(0))>>>0;
  return palette[hash%palette.length];
}
const SMT2_AGE_BUCKETS = Object.freeze([
  {label:'0–30 วัน',color:'#94a3b8',max:30},
  {label:'31–60 วัน',color:'#fecaca',max:60},
  {label:'61–90 วัน',color:'#f87171',max:90},
  {label:'91–180 วัน',color:'#dc2626',max:180},
  {label:'มากกว่า 180 วัน',color:'#7f1d1d',max:Infinity},
  {label:'ไม่สามารถคำนวณอายุงาน',color:'#64748b',max:null}
]);
const SMT2_MONTHS = ['มค','กพ','มีค','เมย','พค','มิย','กค','สค','กย','ตค','พย','ธค'];
function smt2AgeBucket(record) {
  if(String(record.status||'').trim()==='เสร็จแล้ว')return null;
  const columns=record.columns||{};
  const raw=String(columns['เจ้าหน้าที่ รับเรื่อง']||'').trim();
  const match=raw.match(/^(\\d{1,2})\\s+([ก-๙.]+)\\s+(\\d{4})$/);
  if(!match)return 5;
  const month=SMT2_MONTHS.indexOf(match[2].replace(/\\./g,''));
  const year=Number(match[3]);const day=Number(match[1]);
  if(month<0||day<1||day>31||!(year>=2000&&year<=2099||year>=2500&&year<=2699))return 5;
  const y=year>=2500?year-543:year;
  const date=new Date(Date.UTC(y,month,day));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==month||date.getUTCDate()!==day)return 5;
  const today=new Date();
  const current=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
  const age=Math.floor((current-date.getTime())/86400000);
  if(age<0)return 5;
  return SMT2_AGE_BUCKETS.findIndex(bucket=>bucket.max!==null&&age<=bucket.max);
}
function drawSmt2AgingChart(found) {
  const canvas=$('smt2-chart-aging');
  if(!canvas||typeof window.Chart!=='function')return;
  const counts=SMT2_AGE_BUCKETS.map((_,i)=>found.filter(row=>smt2AgeBucket(row)===i).length);
  smt2Charts.push(new window.Chart(canvas,{plugins:[smt2ValueLabels],type:'bar',data:{
    labels:SMT2_AGE_BUCKETS.map(x=>x.label),
    datasets:[{label:'งานค้าง',data:counts,backgroundColor:SMT2_AGE_BUCKETS.map(x=>x.color),borderRadius:4}]
  },options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',layout:{padding:{right:48}},plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grace:'15%',ticks:{precision:0}},y:{ticks:{autoSkip:false}}}}}));
}
function drawSmt2Charts(found) {
  destroySmt2Charts();
  const ChartClass=window.Chart;
  if(typeof ChartClass !== 'function') return;
  const group=(key,missing='ไม่ระบุ')=>{
    const counts=new Map();
    for(const row of found){const value=String(row[key]||missing).trim()||missing;counts.set(value,(counts.get(value)||0)+1);}
    return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'th')).slice(0,12);
  };
  for(const [id,key,title] of [['smt2-chart-status','status','จำนวนเรื่องตามสถานะ'],['smt2-chart-sheet','sheet','จำนวนเรื่องตามชีตเจ้าหน้าที่'],['smt2-chart-province','province','จำนวนเรื่องตามจังหวัด']]) {
    const canvas=$(id);if(!canvas)continue;
    const pairs=group(key);
    if(!pairs.length)continue;
    smt2Charts.push(new ChartClass(canvas,{plugins:[smt2ValueLabels],type:'bar',data:{labels:pairs.map(x=>x[0]),datasets:[{label:'จำนวนเรื่อง',data:pairs.map(x=>x[1]),backgroundColor:key==='status'?pairs.map(([label])=>smt2StatusColor(label)):'#2563eb',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',layout:{padding:{right:42}},plugins:{legend:{display:false},title:{display:false},tooltip:{enabled:true}},scales:{x:{beginAtZero:true,grace:'15%',ticks:{precision:0}},y:{ticks:{autoSkip:false}}}}}));
  }
}
const accountButton = $('smt2-admin-entry');
function showAccountEmail() { if(accountButton) {accountButton.textContent=accountEmail || 'Google: เชื่อมต่อแล้ว'; accountButton.title=accountEmail || 'บัญชี Google ที่เชื่อมต่อ';} }
async function resolveAccountEmail(currentToken, currentGeneration) {
  try {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
      headers:{Authorization:'Bearer '+currentToken},credentials:'omit',cache:'no-store',redirect:'error'
    });
    if(!response.ok) return;
    const profile = await response.json();
    if(currentGeneration !== generation || token !== currentToken) return;
    if(typeof profile.email === 'string' && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(profile.email)) {
      accountEmail = profile.email;showAccountEmail();
    }
  } catch { /* Email is optional; Sheets access remains available. */ }
}
if (root) {
  root.innerHTML = `<div class="smt2-panel"><p id="smt2-message" role="status" aria-live="polite" hidden></p><button id="smt2-login" type="button">เข้าสู่ระบบด้วย Google</button><button id="smt2-logout" type="button" hidden>ออกจากระบบ SMT2</button><button id="smt2-refresh" type="button" hidden>รีเฟรชข้อมูล</button><div id="smt2-data"></div></div>`;
  const message = text => { const el=$('smt2-message');el.textContent=text;el.hidden = !text || text.startsWith('เชื่อมต่อ Google Sheets สำเร็จ') || text.startsWith('กำลังอ่านข้อมูล'); };
  const open = () => { if (typeof window.showContent === 'function') window.showContent('smt2'); };
  function clearSession(text, revoke = true) {
    const oldToken = token;
    destroySmt2Charts();
    window.dispatchEvent(new Event('landright-auth-cleared'));
    generation++; activeRequest?.abort(); activeRequest = null;
    clearTimeout(expiryTimer); token = null; expiresAt = 0; accountEmail = null; records = []; pending = false;
    $('smt2-data').replaceChildren(); $('smt2-login').hidden = false; $('smt2-login').disabled = false;
    $('smt2-logout').hidden = true; $('smt2-refresh').hidden = true; $('smt2-refresh').disabled = false;
    if (menu) menu.hidden = true;
    if ($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'เข้าสู่ระบบ Google';
    message(text);
    // Clear local state even if the external identity library fails to revoke.
    if (revoke && oldToken) { try { window.google?.accounts?.oauth2.revoke(oldToken, () => {}); } catch {} }
  }
  function render(warnings) {
    $('smt2-data').innerHTML = `<div class="smt2-filters"><label>กลุ่มงาน<select id="smt2-group"><option value="">ทุกกลุ่ม</option><option value="กลุ่มต่างด้าว">กลุ่มต่างด้าว</option><option value="กลุ่มศาสนา">กลุ่มศาสนา</option><option value="ฝ่ายตรวจสอบ">ฝ่ายตรวจสอบ</option></select></label><label>ค้นหา<input id="smt2-search" type="search" placeholder="เรื่อง จังหวัด เลขหนังสือ เจ้าหน้าที่"></label><label>ชีตเจ้าหน้าที่<select id="smt2-sheet"></select></label><label>สถานะ<select id="smt2-status"></select></label><label>จังหวัด<select id="smt2-province"></select></label></div><p id="smt2-warning"></p><div id="smt2-dashboard" class="smt2-dashboard"></div><div class="smt2-chart-grid" aria-label="กราฟสรุป SMT2"><section><h4>อายุงานค้างนับจากวันที่เจ้าหน้าที่รับเรื่อง</h4><div class="smt2-chart-frame" style="height:330px"><canvas id="smt2-chart-aging" role="img" aria-label="กราฟอายุงานค้างตามช่วงเวลา"></canvas></div><p>ไม่นับงานสถานะเสร็จแล้ว · เกณฑ์ 30 / 60 / 90 / 180 วัน</p></section><section><h4>จำนวนเรื่องตามสถานะ</h4><div class="smt2-chart-frame"><canvas id="smt2-chart-status" role="img" aria-label="กราฟจำนวนเรื่องตามสถานะ"></canvas></div></section><section><h4>จำนวนเรื่องตามชีตเจ้าหน้าที่</h4><div class="smt2-chart-frame"><canvas id="smt2-chart-sheet" role="img" aria-label="กราฟจำนวนเรื่องตามชีตเจ้าหน้าที่"></canvas></div></section><section><h4>จำนวนเรื่องตามจังหวัด (12 อันดับแรก)</h4><div class="smt2-chart-frame"><canvas id="smt2-chart-province" role="img" aria-label="กราฟจำนวนเรื่องตามจังหวัด"></canvas></div></section></div><p id="smt2-count" role="status"></p><div id="smt2-results" role="region" aria-label="ตารางข้อมูล SMT2" tabindex="0"></div><div class="smt2-pages"><button id="smt2-prev" type="button">หน้าก่อนหน้า</button><span id="smt2-page"></span><button id="smt2-next" type="button">หน้าถัดไป</button></div>`;
    const options = (id,key,fallback='') => {
      const values = [...new Set(records.map(r => r[key] || fallback).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
      $(id).innerHTML = '<option value="">ทั้งหมด</option>' + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    };
    options('smt2-sheet','sheet'); options('smt2-status','status','ไม่ระบุสถานะ'); options('smt2-province','province');
    $('smt2-warning').textContent = warnings.length ? 'บางชีตขาดคอลัมน์ที่รู้จัก (ช่องจะแสดง —): ' + warnings.join('; ') : '';
    let page = 1;
    const draw = () => {
      const group=$('smt2-group').value;
      const matchingGroup=group ? records.filter(r=>groupForRecord(r)===group) : records;
      const found = filterRecords(matchingGroup, {query:$('smt2-search').value,sheet:$('smt2-sheet').value,status:$('smt2-status').value,province:$('smt2-province').value});
      const summary = summarize(found), pages = Math.max(1,Math.ceil(found.length/10));
      page = Math.min(page,pages);
      $('smt2-dashboard').replaceChildren();
      drawSmt2Charts(found);
      drawSmt2AgingChart(found);
      $('smt2-count').textContent = `พบ ${found.length.toLocaleString('th-TH')} จาก ${records.length.toLocaleString('th-TH')} รายการ`;
      const displayedColumns = [
        ['ลำดับ',['ลำดับ']],
        ['จังหวัด',['จังหวัด']],
        ['หมายเลขเอกสารสิทธิ ผู้ขอ/ผู้ร้อง',['หมายเลขเอกสารสิทธิ ผู้ขอ/ผู้ร้อง','หมายเลขเอกสารสิทธิ     ผู้ขอ/ผู้ร้อง/ผู้เกี่ยวข้อง','หมายเลขเอกสารสิทธิ ผู้ขอ/ผู้ร้อง/ผู้เกี่ยวข้อง']],
        ['เลขที่หนังสือ',['เลขที่หนังสือ']],
        ['E-contact DC',['E-contact DC']],
        ['ประเภท',['ประเภท']],
        ['สำนักฯ รับเรื่อง',['สำนักฯ รับเรื่อง']],
        ['เจ้าหน้าที่ รับเรื่อง',['เจ้าหน้าที่ รับเรื่อง']],
        ['เจ้าหน้าที่รับผิดชอบ',['เจ้าหน้าที่รับผิดชอบ']],
        ['สถานะปัจจุบัน',['สถานะปัจจุบัน']],
        ['เลขที่หนังสือจังหวัดตอบล่าสุด',['เลขที่หนังสือจังหวัดตอบล่าสุด']]
      ];
      const normalizeHeader = value => String(value||'').normalize('NFKC').replace(/\\s+/g,'').toLocaleLowerCase('th');
      const thaiDateMonths = 'ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.'.split(' ');
      const buddhistDateDisplay = (value, header) => {
        const original=String(value??'');
        if (!/วันที่|วันรับ|วันส่ง|วันตอบ|date/i.test(header)) return original;
        const monthPattern='(ม\\.?ค\\.?|ก\\.?พ\\.?|มี\\.?ค\\.?|เม\\.?ย\\.?|พ\\.?ค\\.?|มิ\\.?ย\\.?|ก\\.?ค\\.?|ส\\.?ค\\.?|ก\\.?ย\\.?|ต\\.?ค\\.?|พ\\.?ย\\.?|ธ\\.?ค\\.?)';
        const re=new RegExp('(^|[^0-9])([0-3]?\\d)\\s+'+monthPattern+'\\s*(20\\d{2}|25\\d{2})(?=$|[^0-9])','g');
        return original.replace(re,(whole,prefix,day,month,year)=>{
          const y=Number(year),d=Number(day);
          const monthIndex=thaiDateMonths.findIndex(m=>m.replace(/\\./g,'')===month.replace(/\\./g,''));
          if(d<1||d>31||monthIndex<0)return whole;
          const gregorianYear=y>=2500?y-543:y;
          const check=new Date(Date.UTC(gregorianYear,monthIndex,d));
          if(check.getUTCFullYear()!==gregorianYear||check.getUTCMonth()!==monthIndex||check.getUTCDate()!==d)return whole;
          return prefix+day+' '+thaiDateMonths[monthIndex]+' '+String(y>=2500?y:y+543);
        });
      };
      const pageRows=found.slice((page-1)*10,page*10);
      const getColumn=(record,names)=>{
        const cols=record.columns||{};
        const match=Object.keys(cols).find(header=>names.some(name=>normalizeHeader(header)===normalizeHeader(name)));
        return match ? buddhistDateDisplay(cols[match],match) : '';
      };
      $('smt2-results').innerHTML = found.length ? '<div style="overflow-x:auto"><table><caption>รายการข้อมูล SMT2 (10 รายการต่อหน้า)</caption><thead><tr>' + displayedColumns.map(([label])=>'<th scope="col">'+esc(label)+'</th>').join('') + '</tr></thead><tbody>' + pageRows.map(r=>'<tr>'+displayedColumns.map(([,names])=>'<td>'+esc(getColumn(r,names)||'—')+'</td>').join('')+'</tr>').join('') + '</tbody></table></div>' : '<p>ไม่พบรายการตามตัวกรอง</p>';
      $('smt2-page').textContent = `หน้า ${page} / ${pages}`;
      $('smt2-prev').disabled = page === 1; $('smt2-next').disabled = page === pages;
    };
    $('smt2-search').addEventListener('input',()=>{page=1;draw();});
    for (const id of ['smt2-group','smt2-sheet','smt2-status','smt2-province']) $(id).addEventListener('change',()=>{page=1;draw();});
    $('smt2-prev').addEventListener('click',()=>{page--;draw();});
    $('smt2-next').addEventListener('click',()=>{page++;draw();}); draw();
  }
  async function load() {
    if (!token || Date.now() >= expiresAt) { clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); return; }
    const current = generation;
    activeRequest?.abort(); const request = new AbortController(); activeRequest = request;
    const timeout = setTimeout(()=>request.abort(),30000);
    $('smt2-refresh').disabled = true;
    destroySmt2Charts();records = []; $('smt2-data').replaceChildren(); message('กำลังอ่านข้อมูลจาก Google Sheets ทั้ง 8 ชีต…');
    try {
      const result = await readStaffSheets({spreadsheetId:cfg.spreadsheetId,accessToken:token,signal:request.signal});
      if (current !== generation || request.signal.aborted) return;
      if (Date.now() >= expiresAt) { clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); return; }
      records = result.records; render(result.warnings);
      message('เชื่อมต่อ Google Sheets สำเร็จ (อ่านอย่างเดียว)');
      $('smt2-login').hidden = true; $('smt2-logout').hidden = false; $('smt2-refresh').hidden = false;
      if (menu) menu.hidden = false;
      if ($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'เชื่อมต่อข้อมูลแล้ว';
    } catch (error) {
      if (current !== generation) return;
      const reason = error.name === 'AbortError' ? 'การอ่านข้อมูลใช้เวลานานเกินไป กรุณาเข้าสู่ระบบแล้วลองใหม่' : error instanceof TypeError ? 'เชื่อมต่อ Google Sheets ไม่สำเร็จ กรุณาตรวจเครือข่าย' : error.message;
      // A data/schema error must not revoke a valid Google OAuth session.
      records = []; $('smt2-data').replaceChildren();
      $('smt2-login').hidden = true; $('smt2-logout').hidden = false; $('smt2-refresh').hidden = false;
      message(reason + ' — ตรวจสอบหัวตารางแล้วกดรีเฟรชข้อมูลได้โดยไม่ต้องเข้าสู่ระบบใหม่'); open();
    } finally {
      clearTimeout(timeout);
      if (activeRequest === request) activeRequest = null;
      if (current === generation) { pending = false; $('smt2-login').disabled = false; $('smt2-refresh').disabled = false; }
    }
  }
  function login() {
    open();
    if (token && Date.now() < expiresAt) { window.dispatchEvent(new Event('landright-auth-ready')); return; }
    if (pending) return;
    if (!/^[0-9]+-[A-Za-z0-9]+\.apps\.googleusercontent\.com$/.test(cfg.oauthClientId || '') || !/^[A-Za-z0-9_-]+$/.test(cfg.spreadsheetId || '')) { message('ยังไม่ได้ตั้งค่า OAuth Client ID หรือรหัส Google Sheets ที่ถูกต้อง'); return; }
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) { message('ไม่สามารถโหลดบริการ Google Identity ได้ กรุณาตรวจเครือข่ายแล้วลองอีกครั้ง'); return; }
    pending = true; $('smt2-login').disabled = true;
    const attempt = ++generation;
    try {
      // Each attempt gets callbacks bound to its generation. Late responses cannot restore a logged-out session.
      tokenClient = oauth.initTokenClient({client_id:cfg.oauthClientId,scope:READONLY_SCOPE,include_granted_scopes:false,
        error_callback: () => { if (attempt === generation) clearSession('ไม่สามารถเปิดหน้าต่างเข้าสู่ระบบ หรือหน้าต่างถูกปิด กรุณาลองใหม่'); },
        callback: async response => {
          if (attempt !== generation) return;
          if (response.error || !response.access_token) { clearSession('การเข้าสู่ระบบไม่สำเร็จ หรือไม่ได้อนุญาตสิทธิ์อ่าน Google Sheets'); return; }
          token = response.access_token;
          accountEmail = null;
          showAccountEmail();
          // Email lookup is optional and must never block the original Sheets login.
          const seconds = Number(response.expires_in);
          if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400 || (response.scope && !response.scope.split(/\s+/).includes(READONLY_SCOPE))) { clearSession('Google ไม่ได้ส่งเซสชันอ่านข้อมูลที่ถูกต้อง'); return; }
          expiresAt = Date.now() + seconds*1000;
          expiryTimer = setTimeout(()=>clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'),seconds*1000);
          $('smt2-logout').hidden = false;
          window.dispatchEvent(new Event('landright-auth-ready'));
          await load();
        }
      });
      tokenClient.requestAccessToken({prompt:'consent'});
    } catch { clearSession('ไม่สามารถเริ่มเข้าสู่ระบบ Google ได้ กรุณาลองใหม่'); }
  }
  window.landrightLogin = () => { window.landrightMenuLogin = true; try { login(); } finally { window.landrightMenuLogin = false; } };
  $('smt2-login').addEventListener('click',login);
  $('smt2-admin-entry')?.addEventListener('click',login);
  $('smt2-logout').addEventListener('click',()=>clearSession('ออกจากระบบแล้ว'));
  $('smt2-refresh').addEventListener('click',load);
  window.addEventListener('pagehide',()=>clearSession('กรุณาเข้าสู่ระบบใหม่',false));
  document.addEventListener('visibilitychange',()=>{if(token && Date.now() >= expiresAt) clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');});
  if (new URLSearchParams(location.search).get('view') === 'smt2') open();
}
