/* Tokens and private records live only in this page's memory. Google enforces file access. */
import {READONLY_SCOPE, readStaffSheets, filterRecords, summarize} from './smt2/sheets-reader.mjs';
const cfg = window.LANDRIGHT_SMT2_CONFIG || {};
const $ = id => document.getElementById(id);
const root = $('smt2-content');
const menu = document.querySelector('[data-smt2-menu]');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token = null, expiresAt = 0, tokenClient = null, records = [], generation = 0, expiryTimer, activeRequest, pending = false;
if (root) {
  root.innerHTML = `<div class="smt2-panel"><h3>ระบบบริหารงาน SMT2</h3><p id="smt2-message" role="status" aria-live="polite">สำหรับบัญชี Google ที่ได้รับสิทธิ์เข้าถึงไฟล์ SMT2 เท่านั้น</p><p>สิทธิ์ Google Sheets เป็นระดับไฟล์ บัญชีที่ได้รับสิทธิ์ไฟล์สามารถอ่านทุกแท็บได้</p><p><a href="./privacy-policy.html">นโยบายความเป็นส่วนตัว</a></p><button id="smt2-login" type="button">เข้าสู่ระบบด้วย Google</button><button id="smt2-logout" type="button" hidden>ออกจากระบบ SMT2</button><button id="smt2-refresh" type="button" hidden>รีเฟรชข้อมูล</button><div id="smt2-data"></div></div>`;
  const message = text => { $('smt2-message').textContent = text; };
  const open = () => { if (typeof window.showContent === 'function') window.showContent('smt2'); };
  function clearSession(text, revoke = true) {
    const oldToken = token;
    generation++; activeRequest?.abort(); activeRequest = null;
    clearTimeout(expiryTimer); token = null; expiresAt = 0; records = []; pending = false;
    $('smt2-data').replaceChildren(); $('smt2-login').hidden = false; $('smt2-login').disabled = false;
    $('smt2-logout').hidden = true; $('smt2-refresh').hidden = true; $('smt2-refresh').disabled = false;
    if (menu) menu.hidden = true;
    if ($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'เข้าสู่ระบบผู้ดูแล';
    message(text);
    // Clear local state even if the external identity library fails to revoke.
    if (revoke && oldToken) { try { window.google?.accounts?.oauth2.revoke(oldToken, () => {}); } catch {} }
  }
  function render(warnings) {
    $('smt2-data').innerHTML = `<div class="smt2-filters"><label>ค้นหา<input id="smt2-search" type="search" placeholder="เรื่อง จังหวัด เลขหนังสือ เจ้าหน้าที่"></label><label>ชีตเจ้าหน้าที่<select id="smt2-sheet"></select></label><label>สถานะ<select id="smt2-status"></select></label><label>จังหวัด<select id="smt2-province"></select></label></div><p id="smt2-warning"></p><div id="smt2-dashboard" class="smt2-dashboard"></div><p id="smt2-count" role="status"></p><div id="smt2-results" role="region" aria-label="ตารางข้อมูล SMT2" tabindex="0"></div><div class="smt2-pages"><button id="smt2-prev" type="button">หน้าก่อนหน้า</button><span id="smt2-page"></span><button id="smt2-next" type="button">หน้าถัดไป</button></div>`;
    const options = (id,key,fallback='') => {
      const values = [...new Set(records.map(r => r[key] || fallback).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
      $(id).innerHTML = '<option value="">ทั้งหมด</option>' + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    };
    options('smt2-sheet','sheet'); options('smt2-status','status','ไม่ระบุสถานะ'); options('smt2-province','province');
    $('smt2-warning').textContent = warnings.length ? 'บางชีตขาดคอลัมน์ที่รู้จัก (ช่องจะแสดง —): ' + warnings.join('; ') : '';
    let page = 1;
    const draw = () => {
      const found = filterRecords(records, {query:$('smt2-search').value,sheet:$('smt2-sheet').value,status:$('smt2-status').value,province:$('smt2-province').value});
      const summary = summarize(found), pages = Math.max(1,Math.ceil(found.length/50));
      page = Math.min(page,pages);
      const list = entries => '<ul>' + entries.map(([label,count])=>`<li>${esc(label)}: <strong>${count.toLocaleString('th-TH')}</strong></li>`).join('') + '</ul>';
      $('smt2-dashboard').innerHTML = `<section><h4>รายการตามตัวกรอง</h4><strong>${summary.total.toLocaleString('th-TH')}</strong></section><section><h4>สถานะปัจจุบัน</h4>${list(summary.byStatus)}</section><section><h4>ชีตเจ้าหน้าที่</h4>${list(summary.bySheet)}</section>`;
      $('smt2-count').textContent = `พบ ${found.length.toLocaleString('th-TH')} จาก ${records.length.toLocaleString('th-TH')} รายการ`;
      const keys = ['sheet','province','subject','reference','officer','status'];
      const labels = ['ชีตเจ้าหน้าที่','จังหวัด','เรื่อง','เลขที่หนังสือ','เจ้าหน้าที่รับผิดชอบ','สถานะปัจจุบัน'];
      $('smt2-results').innerHTML = found.length ? '<table><caption>ข้อมูล SMT2 แบบอ่านอย่างเดียว</caption><thead><tr>' + labels.map(l=>`<th scope="col">${l}</th>`).join('') + '</tr></thead><tbody>' + found.slice((page-1)*50,page*50).map(r=>'<tr>'+keys.map(k=>`<td>${esc(r[k] || '—')}</td>`).join('')+'</tr>').join('') + '</tbody></table>' : '<p>ไม่พบรายการตามตัวกรอง</p>';
      $('smt2-page').textContent = `หน้า ${page} / ${pages}`;
      $('smt2-prev').disabled = page === 1; $('smt2-next').disabled = page === pages;
    };
    $('smt2-search').addEventListener('input',()=>{page=1;draw();});
    for (const id of ['smt2-sheet','smt2-status','smt2-province']) $(id).addEventListener('change',()=>{page=1;draw();});
    $('smt2-prev').addEventListener('click',()=>{page--;draw();});
    $('smt2-next').addEventListener('click',()=>{page++;draw();}); draw();
  }
  async function load() {
    if (!token || Date.now() >= expiresAt) { clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); return; }
    const current = generation;
    activeRequest?.abort(); const request = new AbortController(); activeRequest = request;
    const timeout = setTimeout(()=>request.abort(),30000);
    $('smt2-refresh').disabled = true;
    records = []; $('smt2-data').replaceChildren(); message('กำลังอ่านข้อมูลจาก Google Sheets ทั้ง 8 ชีต…');
    try {
      const result = await readStaffSheets({spreadsheetId:cfg.spreadsheetId,accessToken:token,signal:request.signal});
      if (current !== generation || request.signal.aborted) return;
      if (Date.now() >= expiresAt) { clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); return; }
      records = result.records; render(result.warnings);
      message('เชื่อมต่อ Google Sheets สำเร็จ (อ่านอย่างเดียว)');
      $('smt2-login').hidden = true; $('smt2-logout').hidden = false; $('smt2-refresh').hidden = false;
      if (menu) menu.hidden = false;
      if ($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'SMT2: เชื่อมต่อแล้ว';
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
    if (token && Date.now() < expiresAt) return;
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
          const seconds = Number(response.expires_in);
          if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400 || (response.scope && !response.scope.split(/\s+/).includes(READONLY_SCOPE))) { clearSession('Google ไม่ได้ส่งเซสชันอ่านข้อมูลที่ถูกต้อง'); return; }
          expiresAt = Date.now() + seconds*1000;
          expiryTimer = setTimeout(()=>clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'),seconds*1000);
          $('smt2-logout').hidden = false; await load();
        }
      });
      tokenClient.requestAccessToken({prompt:'consent'});
    } catch { clearSession('ไม่สามารถเริ่มเข้าสู่ระบบ Google ได้ กรุณาลองใหม่'); }
  }
  $('smt2-login').addEventListener('click',login);
  $('smt2-admin-entry')?.addEventListener('click',login);
  $('smt2-logout').addEventListener('click',()=>clearSession('ออกจากระบบแล้ว'));
  $('smt2-refresh').addEventListener('click',load);
  window.addEventListener('pagehide',()=>clearSession('กรุณาเข้าสู่ระบบใหม่',false));
  document.addEventListener('visibilitychange',()=>{if(token && Date.now() >= expiresAt) clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');});
  if (new URLSearchParams(location.search).get('view') === 'smt2') open();
}
