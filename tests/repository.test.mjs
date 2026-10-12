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
