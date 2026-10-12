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
