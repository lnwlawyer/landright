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
 for (const value of ['chart.js','docs.google.com/spreadsheets','loadDataFromSheet','updateAbandonedDashboard']) assert.ok(html.includes(value), value);
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
 const match = html.match(/        function convertAreaToWah\(areaString\) \{[\s\S]*?\n        \}\n\n        function convertWahToRaiNganWah\(totalWah\) \{[\s\S]*?\n        \}\n/);
 assert.ok(match, 'area helpers exist');
 const helpers = new Function(match[0] + '; return { convertAreaToWah, convertWahToRaiNganWah };')();
 assert.equal(helpers.convertAreaToWah('4-3-15.25'), 1915.25);
 assert.equal(helpers.convertWahToRaiNganWah(1915.25), '4-3-15.25');
 assert.equal(helpers.convertWahToRaiNganWah(500.5), '1-1-0.5');
 assert.equal(helpers.convertWahToRaiNganWah(400), '1-0-0');
 assert.equal(helpers.convertWahToRaiNganWah(0), '0-0-0');
 assert.equal(helpers.convertWahToRaiNganWah(1200), '3-0-0');
 assert.equal(helpers.convertAreaToWah('2-4-20'), 0);
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
