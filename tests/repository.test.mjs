import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
test('existing navigation and data sections remain present', () => {
 for (const key of ['overview','foreigners','religious','abandoned','users','settings']) {
  assert.match(html, new RegExp('id="'+key+'-content"'));
 }
 for (const key of ['section93','section96','boi','commercial']) {
  assert.match(html, new RegExp("showTab\\('"+key+"'"));
 }
});
test('dashboard dependencies and data connectors remain present', () => {
 for (const value of ['chart.js','loadDataFromSheet','loadDataFromSheet','updateAbandonedDashboard']) assert.ok(html.includes(value), value);
});
test('PWA manifest is valid and uses a relative start URL', () => {
 assert.equal(manifest.start_url, './index.html');
 assert.equal(manifest.display, 'standalone');
 assert.ok(manifest.name);
});

test('spreadsheet-derived labels are HTML-escaped in table templates', () => {
 assert.match(html, /function escapeSheetHtml\(value\)/);
 for (const field of ['client_name', 'province', 'status', 'mosque_name']) {
  assert.ok(html.includes('escapeSheetHtml(item.' + field + ')'), field);
  assert.ok(!html.includes('${item.' + field + " || ''}"), 'unsafe interpolation: ' + field);
 }
});

test('CSV parser handles quoted commas, escaped quotes, and newlines', () => {
 const match = html.match(/        function parseCSV\(text\) \{[\s\S]*?\n        \}\n/);
 assert.ok(match, 'parseCSV must exist');
 const parseCSV = new Function(match[0].trim() + '; return parseCSV;')();
 const rows = parseCSV('name,province,notes\r\n"Office, A",Bangkok,"line one\nline two"\r\n"Office ""B""",Chiang Mai,ok\r\n');
 assert.equal(rows.length, 2);
 assert.equal(rows[0].name, 'Office, A');
 assert.equal(rows[0].notes, 'line one\nline two');
 assert.equal(rows[1].name, 'Office "B"');
});

test('land area conversion preserves fractional square wah', () => {
  const startMarker = 'function convertAreaToWah(value) {';
  const endMarker = 'function convertWahToRaiNganWah(totalWah) {';

  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);

  assert.ok(start >= 0 && end > start, 'area helpers exist');

  const remainder = html.slice(end);
  const nextFunction = remainder.indexOf('function ', endMarker.length);
  assert.ok(nextFunction > 0, 'area helper boundary exists');

  const source = html.slice(start, end + nextFunction);

  const helpers = new Function(
    source + '; return {convertAreaToWah, convertWahToRaiNganWah, getLandAreaWah};'
  )();

  assert.equal(helpers.convertAreaToWah('4-3-15.25'), 1915.25);
  assert.equal(helpers.convertWahToRaiNganWah(1915.25), '4-3-15.25');
  assert.equal(helpers.convertWahToRaiNganWah(500.5), '1-1-0.5');
  assert.equal(helpers.convertWahToRaiNganWah(400), '1-0-0');
  assert.equal(helpers.convertWahToRaiNganWah(0), '0-0-0');
  assert.equal(helpers.convertWahToRaiNganWah(1200), '3-0-0');
  assert.equal(helpers.convertAreaToWah('2-4-20'), 0);
  assert.equal(helpers.getLandAreaWah({area_rai: '4-3-15.25'}), 1915.25);
});

test('mobile users can zoom and page has a descriptive title', () => {
 assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/);
 assert.doesNotMatch(html, /user-scalable=no/);
 assert.match(html, /<title>LandRight \| ระบบข้อมูลที่ดิน<\/title>/);
});

test('PWA permits landscape orientation on tablets', () => {
 assert.equal(manifest.orientation, undefined);
 assert.equal(manifest.short_name, 'LandRight');
});

test('table search does not match records with missing fields', () => {
 const match = html.match(/            function filterData\(prefix, originalData\) \{[\s\S]*?\n            \}\n/);
 assert.ok(match);
 const document = { getElementById: id => id.startsWith('searchInput') ? { value: 'bangkok' } : null };
 const filterData = new Function('document', match[0] + '; return filterData;')(document);
 const rows = [{ province: 'Bangkok' }, { province: 'Chiang Mai' }, { id: '123' }];
 assert.deepEqual(filterData('Abandoned', rows), [rows[0]]);
 assert.deepEqual(filterData('Securities', rows), [rows[0]]);
});

test('pagination resets on search and nationality filter changes', () => {
 assert.match(html, /searchInput\.addEventListener\('input', \(\) => \{ currentPage = 1; render\(\); \}\)/);
 assert.match(html, /nationalityFilterSelect\.addEventListener\('change', \(\) => \{ currentPage = 1; render\(\); \}\)/);
});

test('table page is clamped before data rows are rendered', () => {
 const start = html.indexOf('function setupPagination(tableId, data, renderFunc, itemsPerPage)');
 const end = html.indexOf('function filterData(prefix, originalData)', start);
 assert.ok(start >= 0 && end > start);
 const renderBody = html.slice(start, end);
 assert.match(renderBody, /currentPage = Math\.min\(Math\.max\(1, currentPage\), totalPages\)/);
 assert.ok(renderBody.indexOf('currentPage = Math.min') < renderBody.indexOf('renderFunc(filteredData'));
});

test('active pagination button is announced to assistive technology', () => {
 assert.match(html, /if \(i === currentPage\) pageButton\.setAttribute\('aria-current', 'page'\)/);
});

test('remaining spreadsheet text fields are escaped in table templates', () => {
 for (const field of ['name', 'nationality', 'area_rai', 'land_use_type', 'note']) {
  assert.ok(html.includes('escapeSheetHtml(item.' + field + ')'), field);
  assert.ok(!html.includes('${item.' + field + " || ''}"), 'unsafe interpolation: ' + field);
 }
});

test('religious and Thai-labelled sheet fields are escaped in table HTML', () => {
 for (const field of ['temple_name', 'foundation_name', 'church_name', 'area_rai', 'ประเภทจดทะเบียน', 'กำหนดเวลา', 'วันจดทะเบียน', 'ผู้ให้เช่า']) {
  assert.ok(html.includes('escapeSheetHtml(item.' + field + ')'), field);
  assert.ok(!html.includes('${item.' + field + '}'), 'unsafe field: ' + field);
  assert.ok(!html.includes('${item.' + field + " || ''}"), 'unsafe field: ' + field);
 }
});

test('chart legend escapes untrusted labels and units', () => {
 const start = html.indexOf('function drawPieChart(canvasId, legendId, labels, data, unit)');
 const end = html.indexOf('function drawStackedColumnChart', start);
 assert.ok(start >= 0 && end > start);
 const legend = html.slice(start, end);
 assert.ok(legend.includes('escapeSheetHtml(label)'));
 assert.ok(legend.includes('escapeSheetHtml(unit)'));
 assert.ok(!legend.includes('<span>${label}</span>'));
});

test('pagination navigation has descriptive accessible names', () => {
 for (const phrase of ["prevButton.setAttribute('aria-label', 'หน้าก่อนหน้า')", "nextButton.setAttribute('aria-label', 'หน้าถัดไป')", "firstButton.setAttribute('aria-label', 'ไปหน้าที่ 1')", "pageButton.setAttribute('aria-label', `ไปหน้าที่ ${i}`)", "lastButton.setAttribute('aria-label', `ไปหน้าที่ ${totalPages}`)"]) {
  assert.ok(html.includes(phrase), phrase);
 }
});

test('search covers religious names and Thai registration fields', () => {
 const match = html.match(/            function filterData\(prefix, originalData\) \{[\s\S]*?\n            \}\n/);
 assert.ok(match);
 let term = 'มูลนิธิ';
 const document = { getElementById: id => id.startsWith('searchInput') ? { get value() { return term; } } : null };
 const filterData = new Function('document', match[0] + '; return filterData;')(document);
 const rows = [{ foundation_name: 'มูลนิธิทดสอบ' }, { temple_name: 'วัดทดสอบ' }, { 'ผู้ให้เช่า': 'บริษัททดสอบ' }];
 assert.deepEqual(filterData('Commercial', rows), [rows[0]]);
 term = 'บริษัท';
 assert.deepEqual(filterData('Commercial', rows), [rows[2]]);
 term = 'วัด';
 assert.deepEqual(filterData('96', rows), [rows[1]]);
});

test('CSV parser rejects unterminated quoted values without partial data', () => {
 const match = html.match(/        function parseCSV\(text\) \{[\s\S]*?\n        \}\n/);
 assert.ok(match);
 const parseCSV = new Function(match[0].trim() + '; return parseCSV;')();
 assert.throws(() => parseCSV('name,province\n"unfinished,Bangkok'), /unterminated quoted field/);
 assert.deepEqual(parseCSV('name,province\n"valid",Bangkok'), [{ name: 'valid', province: 'Bangkok' }]);
});

test('CSV parser rejects duplicate headers instead of overwriting values', () => {
 const match = html.match(/        function parseCSV\(text\) \{[\s\S]*?\n        \}\n/);
 assert.ok(match);
 const parseCSV = new Function(match[0].trim() + '; return parseCSV;')();
 assert.throws(() => parseCSV('name,province,name\nA,B,C'), /duplicate column headers/);
 assert.throws(() => parseCSV('name, name\nA,B'), /duplicate column headers/);
 assert.deepEqual(parseCSV('name,province\nA,B'), [{ name: 'A', province: 'B' }]);
});

test('table search safely ignores null and non-object records', () => {
 const match = html.match(/            function filterData\(prefix, originalData\) \{[\s\S]*?\n            \}\n/);
 assert.ok(match);
 const document = { getElementById: id => id.startsWith('searchInput') ? { value: 'Bangkok' } : null };
 const filterData = new Function('document', match[0] + '; return filterData;')(document);
 assert.deepEqual(filterData('Abandoned', [null, undefined, 'bad', { province: 'Bangkok' }]), [{ province: 'Bangkok' }]);
 assert.deepEqual(filterData('Abandoned', null), []);
});

test('empty filtered tables retain one logical pagination page', () => {
 const start = html.indexOf('function updateNav(totalRecordsCount)');
 const end = html.indexOf('const prevButton = document.getElementById', start);
 assert.ok(start >= 0 && end > start);
 assert.match(html.slice(start, end), /const totalPages = Math\.max\(1, Math\.ceil\(totalRecordsCount \/ itemsPerPage\)\)/);
});

test('UI removes misleading account and nonfunctional header actions', () => {
 assert.ok(!html.includes('admin@example.com'));
 assert.ok(!html.includes('fa-bell text-xl'));
 assert.ok(!html.includes('fa-search text-xl'));
 assert.ok(html.includes('LandRight'));
});
test('responsive UI supports mobile charts and reduced motion', () => {
 assert.match(html, /@media \(max-width: 640px\)/);
 assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
 assert.match(html, /aria-label="เปิดเมนูนำทาง"/);
 assert.match(html, /aria-current', 'page'/);
});

test('mobile navigation stays open for submenu expansion and supports Escape', () => {
 assert.ok(html.includes("!item.closest('a[onclick^=\"toggleSubmenu\"]')"));
 assert.ok(html.includes("event.key === 'Escape'"));
 assert.ok(html.includes("mobileMenuButton.focus()"));
 assert.ok(html.includes("mobileMenuButton.setAttribute('aria-expanded', String(opening))"));
 assert.ok(html.includes('aria-controls="land-rights-submenu"'));
});

test('dashboard preserves active subtab and announces selected state', () => {
 assert.ok(html.includes("document.querySelector('#foreigners-content .tab-button[aria-selected=\"true\"]')"));
 assert.ok(html.includes("document.querySelector('#religious-content .religious-tab-button[aria-selected=\"true\"]')"));
 assert.ok(html.includes("activeTabButton.setAttribute('aria-selected', 'true')"));
 assert.ok(html.includes("button.setAttribute('aria-selected', 'false')"));
});

test('wide data tables are keyboard accessible scroll regions', () => {
 const regions = html.match(/role="region" aria-label="ตารางข้อมูล เลื่อนในแนวนอนเพื่อดูคอลัมน์เพิ่มเติม" tabindex="0"/g) || [];
 assert.ok(regions.length >= 10);
 assert.ok(html.includes('overscroll-x-contain'));
});

test('asynchronous data loading never resets the selected section', () => {
 const start = html.indexOf("document.addEventListener('DOMContentLoaded', async function()");
 assert.ok(start >= 0);
 const loader = html.slice(start);
 assert.doesNotMatch(loader, /showContent\('overview'\)/);
 assert.match(html, /id="overview-content" class="content-section"/);
 assert.match(html, /id="foreigners-content" class="content-section hidden"/);
});

test('SMT2 is integrated without removing existing LandRight navigation', () => {
 const smt = readFileSync(new URL('../smt2/index.html', import.meta.url), 'utf8');
 assert.ok(html.includes('id="smt2-content"'));
 for (const page of ['org-structure','dashboard','table']) assert.ok(smt.includes('id="'+page+'"'));
 assert.ok(smt.includes('href="../index.html"'));
 assert.ok(smt.includes("addNewBtn.disabled = true"));
 assert.ok(smt.includes("saveBtn.disabled = true"));
 assert.ok(smt.includes('ยังไม่ได้เชื่อมต่อ Backend ที่ปลอดภัย'));
});

test('SMT2 write guard reference fails closed and protects sheet edits', () => {
 const guard = readFileSync(new URL('../smt2/backend/write-guards.reference.gs', import.meta.url), 'utf8');
 for (const required of ['SMT2_EDITOR_EMAILS', 'NOT_AUTHORIZED', 'SHEET_NOT_ALLOWED', 'INVALID_ROW', 'COLUMN_MISMATCH', 'CONFLICT_RELOAD_REQUIRED', 'LockService.getDocumentLock()', 'expectedValues']) {
  assert.ok(guard.includes(required), required);
 }
 assert.ok(!guard.includes('function doPost('), 'do not expose a public write endpoint');
});

test('public SMT2 route does not expose case data or editing controls', () => {
 const publicHtml = readFileSync(new URL('../smt2/public.html', import.meta.url), 'utf8');
 assert.match(publicHtml, /ยังไม่มีชุดข้อมูลสรุป SMT2 ที่ได้รับการอนุมัติ/);
 assert.match(publicHtml, /จำกัดเฉพาะเจ้าหน้าที่/);
 for (const forbidden of ['google.script.run', 'getCombinedDashboardData', 'getServerData', 'addRecord(', 'updateRecord(', 'script.google.com/macros/', '<iframe']) {
  assert.ok(!publicHtml.includes(forbidden), forbidden);
 }
 assert.ok(html.includes('id="smt2-content"'));
});

test('public SMT2 summary accepts only approved, reconciled aggregates', async () => {
 const {validatePublicSnapshot} = await import('../smt2/public-dashboard.mjs');
 const valid = {schemaVersion:1,approvedForPublic:true,asOf:'2026-10-01',approvedOn:'2026-10-12',summary:{totalRecords:10,completedRecords:5,pendingRecords:5},byStatus:[{label:'เสร็จ',count:5},{label:'ค้าง',count:5}],byGroup:[{label:'กลุ่ม 1',count:10}]};
 assert.equal(validatePublicSnapshot(valid),true);
 for (const change of [
  {approvedForPublic:false},
  {secret:'private'},
  {summary:{...valid.summary,totalRecords:11}},
  {byStatus:[{label:'<img>',count:10}]},
  {byGroup:[{label:'กลุ่ม 1',count:-1}]},
  {approvedOn:'2026-09-01'}
 ]) assert.equal(validatePublicSnapshot({...valid,...change}),false);
});
test('public SMT2 page fetches only approved local JSON', () => {
 const page = readFileSync(new URL('../smt2/public.html',import.meta.url),'utf8');
 assert.match(page,/fetch\('\.\/approved-summary\.json'/);
 assert.match(page,/validatePublicSnapshot\(snapshot\)/);
 assert.ok(!page.includes('script.google.com/macros/'));
 assert.ok(!page.includes('google.script.run'));
});

test('SMT2 public snapshots reject invalid dates, future approvals and small cells', async () => {
 const {validatePublicSnapshot} = await import('../smt2/public-dashboard.mjs');
 const valid = {schemaVersion:1,approvedForPublic:true,asOf:'2026-10-01',approvedOn:'2026-10-12',summary:{totalRecords:10,completedRecords:5,pendingRecords:5},byStatus:[{label:'เสร็จ',count:5},{label:'ค้าง',count:5}],byGroup:[{label:'กลุ่ม ก',count:10}]};
 assert.equal(validatePublicSnapshot(valid),true);
 for (const change of [
  {asOf:'2026-02-30'},
  {approvedOn:'2099-01-01'},
  {byStatus:[{label:'เสร็จ',count:9},{label:'ค้าง',count:1}]},
  {byGroup:[{label:'กลุ่ม ก ',count:10}]},
  {byGroup:[{label:'กลุ่ม ก'+String.fromCharCode(10),count:10}]}
 ]) assert.equal(validatePublicSnapshot({...valid,...change}),false);
});

test('SMT2 public dashboard matches LandRight shell without exposing restricted tools', () => {
 const page=readFileSync(new URL('../smt2/public.html',import.meta.url),'utf8');
 for(const required of ['family=Prompt','class="sidebar"','class="topbar"','class="workspace"','class="main"','class="stat"','id="mobile-menu-button"','id="mobile-overlay"','aria-current="page"','href="../index.html"','id="publication-status"','id="published-dashboard"']) assert.ok(page.includes(required),required);
 for(const forbidden of ['google.script.run','getServerData(', 'updateRecord(', 'addRecord(', 'script.google.com/macros/']) assert.ok(!page.includes(forbidden),forbidden);
 assert.ok(page.includes('validatePublicSnapshot(snapshot)'));
 assert.ok(page.includes('prefers-reduced-motion'));
});

test('SMT2 is a native LandRight section without separate-page navigation', () => {
 assert.ok(html.includes('id="smt2-content" class="content-section hidden"'));
 assert.ok(html.includes('toggleSubmenu(\'smt2\', event)'));
 assert.ok(html.includes('id="smt2-submenu"'));
 assert.ok(html.includes('aria-controls="smt2-submenu"'));
 assert.ok(html.includes('window.landrightSMT2SelectView(\'dashboard\',event)'));
 assert.ok(html.includes("'smt2': 'ข้อมูลงาน'"));
 assert.ok(!html.includes("if (section === 'smt2') loadSmt2PublicDashboard()"));
 assert.ok(!html.includes("import {createInlineController} from './smt2/inline-dashboard.mjs'"));
 assert.ok(readFileSync(new URL('../smt2/inline-dashboard.mjs',import.meta.url),'utf8').includes("SMT2_SNAPSHOT_PATH = './smt2/approved-summary.json'"));
 assert.ok(!html.includes('href="smt2/public.html"'));
});

test('SMT2 public snapshot module remains isolated from the OAuth staff entry', () => {
 assert.ok(!html.includes('id="smt2-refresh"'));
 assert.ok(!html.includes('id="smt2-public-meta"'));
 assert.ok(html.includes('id="smt2-admin-entry"'));
 assert.ok(!html.includes('script.google.com/macros/'));
 assert.ok(html.includes('src="smt2.js" type="module"'));
 assert.match(html, /data-smt2-menu/);
 assert.ok(html.includes("new URLSearchParams(location.search).get('view') === 'smt2'"));
 assert.ok(!html.includes("window.loadSmt2PublicDashboard = () => controller.load()"));
 const module = readFileSync(new URL('../smt2/inline-dashboard.mjs',import.meta.url),'utf8');
 for (const text of ['validatePublicSnapshot(data)','redirect:\'error\'','credentials:\'omit\'','AbortController','clearTimeout(timeout)','root.replaceChildren()','button.disabled=true','button.disabled=false']) assert.ok(module.includes(text),text);
 for (const secret of ['google.script.run','updateRecord(', 'addRecord(', 'getServerData(', 'script.google.com/macros/']) assert.ok(!module.includes(secret),secret);
});
test('SMT2 inline module provides strict public snapshot data contract', async () => {
 const {describeSnapshot,SMT2_MAX_BYTES} = await import('../smt2/inline-dashboard.mjs');
 assert.equal(SMT2_MAX_BYTES,16384);
 const good={schemaVersion:1,approvedForPublic:true,asOf:'2026-10-01',approvedOn:'2026-10-12',summary:{totalRecords:10,completedRecords:5,pendingRecords:5},byStatus:[{label:'เสร็จ',count:5},{label:'ค้าง',count:5}],byGroup:[{label:'กลุ่ม ก',count:10}]};
 assert.equal(describeSnapshot(good).cards[0][1],10);
 assert.throws(()=>describeSnapshot({...good,approvedForPublic:false}),/UNAPPROVED/);
});

test('SMT2 publication preflight rejects identifying fields and unapproved figures', async () => {
 const {inspectPublication}=await import('../scripts/smt2-public-preflight.mjs');
 const good={schemaVersion:1,approvedForPublic:true,asOf:'2026-10-01',approvedOn:'2026-10-12',summary:{totalRecords:10,completedRecords:5,pendingRecords:5},byStatus:[{label:'เสร็จ',count:5},{label:'ค้าง',count:5}],byGroup:[{label:'กลุ่ม ก',count:10}]};
 assert.deepEqual(inspectPublication(JSON.stringify(good)),[]);
 for(const bad of [
  {...good,approvedForPublic:false},
  {...good,summary:{totalRecords:10,completedRecords:9,pendingRecords:2}},
  {...good,byGroup:[{label:'เลขโฉนด',count:10}]},
  {...good,byStatus:[{label:'เสร็จ',count:9},{label:'ค้าง',count:1}]},
  {...good,asOf:'2099-01-01'},
  {...good,byGroup:[{label:'กลุ่ม ก',count:5},{label:'กลุ่ม ก',count:5}]},
  {...good,byGroup:[{label:'กลุ่ม ก',count:5},{label:'กลุ่ม ก ',count:5}]},
  {...good,caseId:'ABC'},
 ]) assert.ok(inspectPublication(JSON.stringify(bad)).length>0);
 assert.ok(inspectPublication('{broken').length>0);
 assert.ok(inspectPublication(' '.repeat(17000)).length>0);
});
test('SMT2 publication preflight is mandatory in GitHub CI', () => {
 const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('node scripts/smt2-public-preflight.mjs'));
});

test('SMT2 private read guard reference requires server-side identity and column projection', () => {
 const guard=readFileSync(new URL('../smt2/backend/private-read-guards.reference.gs',import.meta.url),'utf8');
 for(const expected of [
  "Session.getActiveUser().getEmail()",
  "SMT2_READER_EMAILS",
  "SMT2_EDITOR_EMAILS",
  "SMT2_READER_COLUMNS",
  "NOT_AUTHORIZED",
  "SHEET_NOT_ALLOWED",
  "COLUMN_NOT_ALLOWED",
  "INVALID_PAGE",
  "INVALID_LIMIT",
  "getDisplayValues()",
  "rows:rows.map",
  "getSheetNames().indexOf(name)",
  "getLastRow()-1",
 ]) assert.ok(guard.includes(expected),expected);
 for(const forbidden of ['doGet(', 'doPost(', 'ContentService.createTextOutput', 'appendRow(', 'setValues(']) assert.ok(!guard.includes(forbidden),forbidden);
 assert.ok(guard.includes('NOT DEPLOYED'));
});
test('SMT2 private migration documentation requires legacy entry-point lockdown and rollback', () => {
 const guide=readFileSync(new URL('../docs/smt2-private-backend-ten-workstreams.md',import.meta.url),'utf8');
 for(const required of ['getServerData','getUniqueColumnValues','getCombinedDashboardData','addRecord','updateRecord','rollback','Anyone','disposable test spreadsheet']) assert.ok(guide.includes(required),required);
});

test('land area dashboards read area_rai consistently with table rows', () => {
 assert.ok(html.includes('function getLandAreaWah(item)'));
 assert.ok(html.includes("getLandAreaWah(item)"));
 assert.ok(!html.includes('convertAreaToWah(item.area)'));
 assert.ok(html.split('getLandAreaWah(item)').length >= 11);
});

// Freeze the existing public feed connections while SMT2 adopts a separate private API.
test('all eleven legacy menu datasets use the private Sheets API source', () => {
  const source = readFileSync(
    new URL('../smt2/landright-menu-source.mjs', import.meta.url),
    'utf8'
  );
  assert.ok(source.includes('export const MENU_SHEETS'));
  assert.ok(source.includes('export async function readMenuSheet'));
  assert.ok(source.includes('sheets.googleapis.com/v4/spreadsheets/'));
  assert.ok(source.includes('Authorization'));
  assert.ok(!source.includes('docs.google.com/spreadsheets/'));
});

test('SMT2 Executive iframe remains invisible until live data and view are ready', () => {
 const source=readFileSync(new URL('../smt2.js',import.meta.url),'utf8');
 assert.ok(source.includes('background:white;visibility:hidden'));
 const ready=source.indexOf('frame.contentWindow.setExecutiveView?.(selectedExecutiveView);');
 const reveal=source.indexOf("frame.style.visibility = 'visible';");
 assert.ok(ready>=0 && reveal>ready);
 assert.ok(source.includes("frame.contentWindow.setExecutiveRecords(records);"));
});
