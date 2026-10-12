/**
 * SMT2 restricted live Google Sheets adapter.
 * SOURCE FILE ONLY: not deployed to Google Apps Script.
 *
 * Before use: remove/secure all legacy public server functions, restrict
 * the Apps Script deployment to named users, and verify caller identity.
 *
 * Required Script Properties (never put them in public JavaScript):
 * SMT2_SPREADSHEET_ID, SMT2_READER_EMAILS, SMT2_EDITOR_EMAILS,
 * SMT2_ALLOWED_SHEETS, SMT2_READER_COLUMNS
 */
function smt2LiveProperty_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (typeof value !== 'string' || !value.trim()) throw new Error('CONFIG_REQUIRED');
  return value.trim();
}
function smt2LiveListProperty_(name) {
  var values = smt2LiveProperty_(name).split(',').map(function(x) { return x.trim(); });
  if (values.some(function(x) { return !x; }) || new Set(values).size !== values.length) {
    throw new Error('INVALID_CONFIGURATION');
  }
  return values;
}
function smt2LivePrincipal_() {
  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('NOT_AUTHORIZED');
  return email;
}
function smt2LiveRequireRole_(role) {
  if (role !== 'reader' && role !== 'editor') throw new Error('NOT_AUTHORIZED');
  var email = smt2LivePrincipal_();
  var editors = smt2LiveListProperty_('SMT2_EDITOR_EMAILS').map(function(x){return x.toLowerCase();});
  var readers = smt2LiveListProperty_('SMT2_READER_EMAILS').map(function(x){return x.toLowerCase();});
  if (editors.indexOf(email) < 0 && (role !== 'reader' || readers.indexOf(email) < 0)) {
    throw new Error('NOT_AUTHORIZED');
  }
  return email;
}
function smt2LiveAllowedNames_() {
  var blocked = ['Config','OrgChart','กลุ่มต่างด้าว','กลุ่มศาสนา'];
  var names = smt2LiveListProperty_('SMT2_ALLOWED_SHEETS');
  if (names.some(function(x){return blocked.indexOf(x) !== -1;})) throw new Error('INVALID_CONFIGURATION');
  return names;
}
function smt2LiveSheet_(name) {
  if (typeof name !== 'string' || name !== name.trim() || smt2LiveAllowedNames_().indexOf(name) < 0) {
    throw new Error('SHEET_NOT_ALLOWED');
  }
  var sheet = SpreadsheetApp.openById(smt2LiveProperty_('SMT2_SPREADSHEET_ID')).getSheetByName(name);
  if (!sheet) throw new Error('SHEET_NOT_FOUND');
  return sheet;
}
/** Authenticated metadata only. Never callable from an anonymous public page. */
function smt2LiveListSheets() {
  smt2LiveRequireRole_('reader');
  var ss = SpreadsheetApp.openById(smt2LiveProperty_('SMT2_SPREADSHEET_ID'));
  return smt2LiveAllowedNames_().filter(function(name){return !!ss.getSheetByName(name);});
}
/** Authenticated, server-projected, bounded read. Does not expose raw records to public UI. */
function smt2LiveReadPage(request) {
  smt2LiveRequireRole_('reader');
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('INVALID_REQUEST');
  var page = request.page === undefined ? 1 : request.page;
  var limit = request.limit === undefined ? 10 : request.limit;
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error('INVALID_PAGE');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error('INVALID_LIMIT');
  var sheet = smt2LiveSheet_(request.sheetName);
  var columns = smt2LiveListProperty_('SMT2_READER_COLUMNS');
  var width = sheet.getLastColumn();
  if (!Number.isSafeInteger(width) || width < 1) throw new Error('INVALID_SHEET_SCHEMA');
  var headers = sheet.getRange(1,1,1,width).getDisplayValues()[0];
  var positions = columns.map(function(column) {
    var index = headers.indexOf(column);
    if (index < 0 || headers.lastIndexOf(column) !== index) throw new Error('COLUMN_NOT_ALLOWED');
    return index;
  });
  var totalRows = Math.max(0,sheet.getLastRow()-1);
  var offset = (page-1)*limit;
  var count = Math.min(limit,Math.max(0,totalRows-offset));
  var raw = count ? sheet.getRange(offset+2,1,count,width).getDisplayValues() : [];
  return {
    page:page, limit:limit, totalRows:totalRows, columns:columns,
    rows:raw.map(function(row) { return positions.map(function(index){return row[index];}); })
  };
}
/** Authenticated connection diagnostic: never returns private spreadsheet contents. */
function smt2LiveHealth() {
  smt2LiveRequireRole_('reader');
  var ss = SpreadsheetApp.openById(smt2LiveProperty_('SMT2_SPREADSHEET_ID'));
  return {ok:true,configuredSheets:smt2LiveAllowedNames_().filter(function(n){return !!ss.getSheetByName(n);}).length};
}
