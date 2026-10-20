/* Tokens and private records live only in this page's memory. Google enforces file access. */
import {READONLY_SCOPE, readStaffSheets} from './smt2/sheets-reader.mjs';
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
// Exact HTML dashboard is loaded as a same-origin view; authenticated records remain in memory.
const EXECUTIVE_HTML = './smt2/executive-dashboard.html';
let executiveFrame = null;
const SMT2_VIEWS = new Set(['dashboard','details','escalation','rebalance','analytics']);
let selectedExecutiveView = 'dashboard';
function syncSMT2Submenu() {
  document.querySelectorAll('[data-smt2-subview]').forEach(link => {
    const active = link.dataset.smt2Subview === selectedExecutiveView;
    link.classList.toggle('bg-blue-700', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });
}
window.landrightSMT2SelectView = (view, event) => {
  event?.preventDefault();
  if (!SMT2_VIEWS.has(view)) return;
  selectedExecutiveView = view;
  syncSMT2Submenu();
  if (typeof window.showContent === 'function') window.showContent('smt2', event);
  if (executiveFrame?.contentWindow?.setExecutiveView) executiveFrame.contentWindow.setExecutiveView(view);
};
function clearExecutiveView() {
  executiveFrame?.remove();
  executiveFrame = null;
  $('smt2-data').hidden = false;
}
function showExecutiveView() {
  clearExecutiveView();
  // Keep the legacy renderer hidden throughout iframe initialization.
  $('smt2-data').hidden = true;
  const frame = document.createElement('iframe');
  frame.title = 'Executive Dashboard ข้อมูลงาน';
  frame.src = EXECUTIVE_HTML;
  frame.style.cssText = 'width:100%;height:max(760px,calc(100vh - 150px));min-height:760px;border:0;border-radius:12px;background:white;visibility:hidden';
  frame.referrerPolicy = 'same-origin';
  frame.addEventListener('load', () => {
    if (executiveFrame !== frame || !token || Date.now() >= expiresAt) return;
    try {
      if (frame.contentWindow.location.origin !== location.origin) throw new Error('origin mismatch');
      if (typeof frame.contentWindow.setExecutiveRecords !== 'function') throw new Error('missing live adapter');
      frame.contentWindow.setExecutiveRecords(records);
      frame.contentWindow.setExecutiveView?.(selectedExecutiveView);
      // Reveal only after the live records and selected view have rendered.
      frame.style.removeProperty('visibility');
      syncSMT2Submenu();
      $('smt2-data').hidden = true;
    } catch (err) {
      console.error('SMT2 executive HTML adapter failed:', err);
      frame.remove();
      if (executiveFrame === frame) executiveFrame = null;
      $('smt2-data').hidden = false;
      $('smt2-data').textContent = 'ไม่สามารถเปิด Executive Dashboard ได้ กรุณารีเฟรชข้อมูลหรือลองอีกครั้ง';
      const status = $('smt2-message');
      if (status) status.textContent = 'ไม่สามารถเปิด Executive Dashboard ได้ กรุณารีเฟรชข้อมูลหรือลองอีกครั้ง';
    }
  });
  $('smt2-data').after(frame);
  executiveFrame = frame;
}
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== executiveFrame?.contentWindow) return;
  if (event.data?.type === 'landright-smt2-refresh-request') load();
});
let token = null, expiresAt = 0, tokenClient = null, records = [], generation = 0, expiryTimer, activeRequest, pending = false;
let accountEmail = null;
const REMEMBER_GOOGLE_KEY = 'landright-remember-google-v1';
const shouldRememberGoogle = () => { try { return localStorage.getItem(REMEMBER_GOOGLE_KEY) === 'yes'; } catch { return false; } };
const setRememberGoogle = enabled => { try { if (enabled) localStorage.setItem(REMEMBER_GOOGLE_KEY,'yes'); else localStorage.removeItem(REMEMBER_GOOGLE_KEY); } catch {} };

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
    clearExecutiveView();
    window.dispatchEvent(new Event('landright-auth-cleared'));
    generation++; activeRequest?.abort(); activeRequest = null;
    clearTimeout(expiryTimer); token = null; expiresAt = 0; accountEmail = null; records = []; pending = false;
    $('smt2-data').replaceChildren(); $('smt2-login').hidden = false; $('smt2-login').disabled = false;
    $('smt2-logout').hidden = true; $('smt2-refresh').hidden = true; $('smt2-refresh').disabled = false;
    if (menu) menu.hidden = false;
    if ($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'เข้าสู่ระบบ Google';
    message(text);
    // Clear local state even if the external identity library fails to revoke.
    if (revoke && oldToken) { try { window.google?.accounts?.oauth2.revoke(oldToken, () => {}); } catch {} }
  }
  async function load() {
    if (!token || Date.now() >= expiresAt) { clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); return; }
    const current = generation;
    activeRequest?.abort(); const request = new AbortController(); activeRequest = request;
    const timeout = setTimeout(()=>request.abort(),30000);
    $('smt2-refresh').disabled = true;
    clearExecutiveView();records = []; $('smt2-data').replaceChildren(); message('กำลังอ่านข้อมูลจาก Google Sheets ทั้ง 8 ชีต…');
    try {
      const result = await readStaffSheets({spreadsheetId:cfg.spreadsheetId,accessToken:token,signal:request.signal});
      if (current !== generation || request.signal.aborted) return;
      if (Date.now() >= expiresAt) { clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); return; }
      records = result.records; showExecutiveView();
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
  function login(silent = false) {
    if (!silent) open();
    if (token && Date.now() < expiresAt) { window.dispatchEvent(new Event('landright-auth-ready')); return; }
    if (pending) return;
    if (!/^[0-9]+-[A-Za-z0-9]+\.apps\.googleusercontent\.com$/.test(cfg.oauthClientId || '') || !/^[A-Za-z0-9_-]+$/.test(cfg.spreadsheetId || '')) { message('ยังไม่ได้ตั้งค่า OAuth Client ID หรือรหัส Google Sheets ที่ถูกต้อง'); return; }
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) { if (!silent) message('ไม่สามารถโหลดบริการ Google Identity ได้ กรุณาตรวจเครือข่ายแล้วลองอีกครั้ง'); return; }
    pending = true; $('smt2-login').disabled = true;
    const attempt = ++generation;
    try {
      // Each attempt gets callbacks bound to its generation. Late responses cannot restore a logged-out session.
      tokenClient = oauth.initTokenClient({client_id:cfg.oauthClientId,scope:READONLY_SCOPE,include_granted_scopes:false,
        error_callback: () => { if (attempt === generation) { if (silent) { pending=false; $('smt2-login').disabled=false; } else clearSession('ไม่สามารถเปิดหน้าต่างเข้าสู่ระบบ หรือหน้าต่างถูกปิด กรุณาลองใหม่'); } },
        callback: async response => {
          if (attempt !== generation) return;
          if (response.error || !response.access_token) { if (silent) { pending=false; $('smt2-login').disabled=false; } else clearSession('การเข้าสู่ระบบไม่สำเร็จ หรือไม่ได้อนุญาตสิทธิ์อ่าน Google Sheets'); return; }
          token = response.access_token;
          setRememberGoogle(true);
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
      // Reuse an existing Google grant when possible; never force consent on every visit.
      // Google may still require an interactive account/consent prompt.
      tokenClient.requestAccessToken({prompt: silent || shouldRememberGoogle() ? '' : 'consent'});
    } catch { if (silent) { pending=false; $('smt2-login').disabled=false; } else clearSession('ไม่สามารถเริ่มเข้าสู่ระบบ Google ได้ กรุณาลองใหม่'); }
  }
  window.landrightLogin = () => { window.landrightMenuLogin = true; try { login(); } finally { window.landrightMenuLogin = false; } };
  $('smt2-login').addEventListener('click',()=>login());
  $('smt2-admin-entry')?.addEventListener('click',()=>login());
  $('smt2-logout').addEventListener('click',()=>{setRememberGoogle(false);clearSession('ออกจากระบบแล้ว');});
  $('smt2-refresh').addEventListener('click',load);
  window.addEventListener('pagehide',()=>clearSession('กรุณาเข้าสู่ระบบใหม่',false));
  document.addEventListener('visibilitychange',()=>{if(token && Date.now() >= expiresAt) clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');});
  if (new URLSearchParams(location.search).get('view') === 'smt2') open();
  // Remember only the user's preference, never tokens or private Sheets data.
  // Google may reject a silent request; manual login remains available.
  if (shouldRememberGoogle()) {
    let attempts=0;
    const restore=()=>{
      if (!shouldRememberGoogle() || token || pending) return;
      if (window.google?.accounts?.oauth2) { login(true); return; }
      if (++attempts < 20) setTimeout(restore,500);
    };
    setTimeout(restore,500);
  }
}
