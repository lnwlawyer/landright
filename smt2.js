/* SMT2: private Sheets reader. OAuth credentials are never persisted. */
(() => {
  'use strict';
  const cfg = window.LANDRIGHT_SMT2_CONFIG || {};
  const tabs = ['การะเกด','ชยาน์ขวัญ','ฉัตรพร','ภทรพงค์','สกุลวรรณ','ปิยะพงษ์','เทอดพงศ์','โสภา'];
  const scope = 'https://www.googleapis.com/auth/spreadsheets.readonly';
  let token = null, tokenClient = null, records = [];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => String(s ?? '').replace(/\\s+/g,'').trim();
  const menu = document.querySelector('[data-smt2-menu]');
  const root = $('smt2-content');
  if (!root) return;
  if (menu) menu.hidden = true;
  root.innerHTML = '<div class="bg-white rounded-xl shadow-sm p-6"><h3 class="text-xl font-semibold mb-3">ระบบบริหารงาน SMT2</h3><p id="smt2-message" class="text-sm text-gray-600 mb-4">สำหรับบัญชี Google ที่ได้รับสิทธิ์เข้าถึงข้อมูล SMT2 เท่านั้น</p><button id="smt2-login" class="rounded-lg bg-blue-800 text-white px-4 py-3">เข้าสู่ระบบด้วย Google</button><button id="smt2-logout" class="hidden rounded-lg bg-gray-200 px-4 py-3 ml-2">ออกจากระบบ SMT2</button><div id="smt2-data" class="mt-5"></div></div>';
  const message = text => { $('smt2-message').textContent = text; };
  const revoke = () => {
    if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
    token = null; records = []; $('smt2-data').replaceChildren();
    $('smt2-logout').classList.add('hidden'); $('smt2-login').classList.remove('hidden');
    if (menu) menu.hidden = true;
    if($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'เข้าสู่ระบบผู้ดูแล';
    if (!root.classList.contains('hidden') && typeof showContent === 'function') showContent('overview');
    message('ออกจากระบบแล้ว');
  };
  $('smt2-logout').addEventListener('click', revoke);
  $('smt2-admin-entry')?.addEventListener('click', () => $('smt2-login').click());
  function render() {
    const container = $('smt2-data');
    container.innerHTML = '<div class="flex flex-wrap gap-3 mb-4"><input id="smt2-search" class="border rounded-lg p-2 flex-1 min-w-48" placeholder="ค้นหาเรื่อง จังหวัด เจ้าหน้าที่ หรือสถานะ"><span id="smt2-count" class="p-2 text-sm"></span></div><div id="smt2-results" class="overflow-x-auto"></div>';
    const draw = () => {
      const q = normalize($('smt2-search').value).toLowerCase();
      const found = records.filter(row => !q || Object.values(row).some(v => normalize(v).toLowerCase().includes(q)));
      $('smt2-count').textContent = 'จำนวน ' + found.length.toLocaleString('th-TH') + ' รายการ';
      const keys = ['_sheet','จังหวัด','เรื่อง','เลขที่หนังสือ','เจ้าหน้าที่รับผิดชอบ','สถานะปัจจุบัน'];
      $('smt2-results').innerHTML = '<table class="min-w-full text-sm"><thead><tr>' + keys.map(k=>'<th class="p-2 text-left">'+esc(k === '_sheet'?'ชีตเจ้าหน้าที่':k)+'</th>').join('') + '</tr></thead><tbody>' + found.slice(0,200).map(r=>'<tr class="border-t">' + keys.map(k=>'<td class="p-2 max-w-sm break-words">'+esc(r[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table>' + (found.length>200?'<p class="text-sm p-2">แสดง 200 รายการแรก กรุณาระบุคำค้นหาเพื่อจำกัดผลลัพธ์</p>':'');
    };
    $('smt2-search').addEventListener('input', draw); draw();
  }
  async function load() {
    if (!token) return;
    message('กำลังอ่านข้อมูลจาก Google Sheets…');
    const ranges = tabs.map(t => "'" + t.replace(/'/g,"''") + "'!A1:Z1000");
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(cfg.spreadsheetId) + '/values:batchGet?' + ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&');
    const response = await fetch(url, {headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if (!response.ok) throw new Error(response.status===403?'บัญชีนี้ไม่มีสิทธิ์อ่าน Google Sheets':response.status===401?'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่':'อ่านข้อมูลไม่สำเร็จ ('+response.status+')');
    const json = await response.json();
    const result = [];
    for (let i=0;i<(json.valueRanges||[]).length;i++) {
      const rows = json.valueRanges[i].values||[];
      if (!rows.length) continue;
      const headers = rows[0].map(normalize);
      for (const values of rows.slice(1)) {
        if (!values.some(v=>String(v).trim())) continue;
        const row = {_sheet:tabs[i]};
        for(let c=0;c<headers.length;c++) if(headers[c]) row[headers[c]] = values[c]??'';
        result.push(row);
      }
    }
    records=result; render(); message('เชื่อมต่อ Google Sheets สำเร็จ (อ่านอย่างเดียว)');
    $('smt2-login').classList.add('hidden'); $('smt2-logout').classList.remove('hidden');
    if(menu) menu.hidden=false;
    if($('smt2-admin-entry')) $('smt2-admin-entry').textContent = 'ผู้ดูแล: SMT2';
  }
  $('smt2-login').addEventListener('click', () => {
    if(!cfg.oauthClientId || !cfg.spreadsheetId){message('ยังไม่ได้ตั้งค่า OAuth Client ID ของเว็บไซต์');return;}
    if(!window.google?.accounts?.oauth2){message('ไม่สามารถโหลดบริการ Google Identity ได้');return;}
    tokenClient ||= google.accounts.oauth2.initTokenClient({
      client_id:cfg.oauthClientId,scope,
      callback: async response => {
        if(response.error || !response.access_token){message('การเข้าสู่ระบบไม่สำเร็จ');return;}
        token=response.access_token;
        try { await load(); } catch(err) { revoke(); message(err.message); }
      }
    });
    tokenClient.requestAccessToken({prompt:'consent'});
  });
  // No automatic token restoration, no local storage, no anonymous private requests.
})();
