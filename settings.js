/* LandRight personal settings: local-only, no privileged write operations. */
(() => {
  'use strict';
  const KEY = 'landright.preferences.v1';
  const DEFAULTS = Object.freeze({theme:'light',fontSize:'normal',startPage:'overview'});
  const START_PAGES = new Set(['overview','foreigners','religious','abandoned','users']);
  let prefs = {...DEFAULTS};
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (data.theme === 'dark') prefs.theme = 'dark';
      if (data.fontSize === 'large') prefs.fontSize = 'large';
      if (START_PAGES.has(data.startPage)) prefs.startPage = data.startPage;
    } catch { /* Unavailable storage should never break the app. */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); return true; }
    catch { return false; }
  }
  function apply() {
    document.body.classList.toggle('lr-dark', prefs.theme === 'dark');
    document.body.classList.toggle('lr-large-text', prefs.fontSize === 'large');
    for (const [id, value] of [['lr-theme',prefs.theme],['lr-font-size',prefs.fontSize],['lr-start-page',prefs.startPage]]) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
  }
  function feedback(message) {
    const el = document.getElementById('lr-settings-feedback');
    if (el) el.textContent = message;
  }
  async function diagnostics() {
    const el = document.getElementById('lr-system-status');
    if (!el) return;
    el.textContent = 'กำลังตรวจสอบไฟล์ระบบ...';
    const checks = await Promise.all(['./assets/landright.css','./assets/chart.js','./smt2/executive-dashboard.html'].map(async url => {
      try {
        const response = await fetch(url, {method:'GET',cache:'no-store'});
        return response.ok ? 'พร้อมใช้งาน' : 'ตรวจสอบไม่สำเร็จ (HTTP '+response.status+')';
      } catch { return 'ไม่สามารถตรวจสอบได้'; }
    }));
    const auth = typeof window.landrightAuthIsReady === 'function'
      ? (window.landrightAuthIsReady() ? 'ยืนยันตัวตนแล้ว (ยังไม่ยืนยันการอ่าน Sheets)' : 'ยังไม่ได้ยืนยันตัวตนสำหรับข้อมูลที่จำกัดสิทธิ์')
      : 'ยังไม่พร้อมตรวจสอบสถานะการยืนยันตัวตน';
    el.textContent = 'ไฟล์รูปแบบหน้าจอ: '+checks[0]+'\nไฟล์กราฟ: '+checks[1]+'\nไฟล์ Executive Dashboard: '+checks[2]+'\nGoogle Sheets: '+auth;
  }
  load();
  function init() {
    apply();
    const inputs = [['lr-theme','theme',['light','dark']],['lr-font-size','fontSize',['normal','large']],['lr-start-page','startPage',[...START_PAGES]]];
    for (const [id,key,allowed] of inputs) {
      document.getElementById(id)?.addEventListener('change',event => {
        if (!allowed.includes(event.target.value)) return;
        prefs[key] = event.target.value;
        apply();
        feedback(save() ? 'บันทึกการตั้งค่าในเบราว์เซอร์แล้ว' : 'ใช้ค่าใหม่ชั่วคราว แต่เบราว์เซอร์ไม่อนุญาตให้บันทึก');
      });
    }
    document.getElementById('lr-reset-preferences')?.addEventListener('click',() => {
      prefs = {...DEFAULTS};apply();feedback(save() ? 'คืนค่าเริ่มต้นแล้ว' : 'คืนค่าเริ่มต้นชั่วคราว');
    });
    document.getElementById('lr-check-system')?.addEventListener('click',diagnostics);
    const originalShowContent = window.showContent;
    if (typeof originalShowContent === 'function') {
      window.showContent = function(section,event) {
        const result = originalShowContent.apply(this,arguments);
        if (section === 'settings') void diagnostics();
        return result;
      };
      if (prefs.startPage !== 'overview') window.showContent(prefs.startPage);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
