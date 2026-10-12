/**
 * SMT2 private Apps Script read guards — REFERENCE ONLY, NOT DEPLOYED.
 *
 * Copy into a restricted Apps Script project only after reviewing all
 * deployment permissions and the existing server entry points.
 * Never rely on hidden UI controls to protect underlying functions.
 *
 * Requires Script Properties:
 * SMT2_READER_EMAILS = comma-separated authorized reader addresses
 * SMT2_EDITOR_EMAILS = comma-separated authorized editor addresses
 *
 * This is not a public GitHub Pages API or a complete migration.
 */
function smt2Principal_() {
  var email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('NOT_AUTHORIZED');
  return email;
}

function smt2Role_(role) {
  var email = smt2Principal_();
  var props = PropertiesService.getScriptProperties();
  var keys = role === 'editor' ? ['SMT2_EDITOR_EMAILS'] : ['SMT2_READER_EMAILS', 'SMT2_EDITOR_EMAILS'];
  var allowed = keys.some(function(key) {
    return String(props.getProperty(key) || '').split(',').some(function(item) {
      return item.trim().toLowerCase() === email;
    });
  });
  if (!allowed) throw new Error('NOT_AUTHORIZED');
  return email;
}

function smt2PrivateSheet_(name) {
  if (typeof name !== 'string' || !name || name !== name.trim()) throw new Error('SHEET_NOT_ALLOWED');
  // These sheet names are NEVER valid as a case-record read/write target.
  if (['Config', 'OrgChart', 'กลุ่มต่างด้าว', 'กลุ่มศาสนา'].indexOf(name) !== -1) {
    throw new Error('SHEET_NOT_ALLOWED');
  }
  if (getSheetNames().indexOf(name) === -1) throw new Error('SHEET_NOT_ALLOWED');
  var sheet = SS.getSheetByName(name);
  if (!sheet) throw new Error('SHEET_NOT_FOUND');
  return sheet;
}

function smt2SafeListSheets() {
  smt2Role_('reader');
  return getSheetNames().filter(function(name) {
    return ['Config','OrgChart','กลุ่มต่างด้าว','กลุ่มศาสนา'].indexOf(name) === -1;
  });
}

function smt2SafeReadPage(input) {
  smt2Role_('reader');
  if (!input || typeof input !== 'object') throw new Error('INVALID_REQUEST');
  var sheet = smt2PrivateSheet_(input.sheetName);
  var page = input.page === undefined ? 1 : input.page;
  var limit = input.limit === undefined ? 10 : input.limit;
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error('INVALID_PAGE');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error('INVALID_LIMIT');
  // A server-side projection is mandatory. Do not forward raw sheet columns
  // or the existing getCombinedDashboardData().records array.
  var allowed = String(PropertiesService.getScriptProperties().getProperty('SMT2_READER_COLUMNS') || '');
  var columns = allowed.split(',').map(function(s){return s.trim();}).filter(Boolean);
  if (!columns.length) throw new Error('READER_COLUMNS_NOT_CONFIGURED');
  var width = sheet.getLastColumn();
  var header = sheet.getRange(1,1,1,width).getDisplayValues()[0];
  var positions = columns.map(function(column) {
    var i = header.indexOf(column);
    if (i < 0 || header.lastIndexOf(column) !== i) throw new Error('COLUMN_NOT_ALLOWED');
    return i;
  });
  var count = Math.max(0,sheet.getLastRow()-1);
  var offset = (page-1)*limit;
  var length = Math.min(limit,Math.max(0,count-offset));
  var rows = length ? sheet.getRange(offset+2,1,length,width).getDisplayValues() : [];
  return {page:page,limit:limit,totalRows:count,columns:columns,rows:rows.map(function(row){
    return positions.map(function(i){return row[i];});
  })};
}

/**
 * IMPORTANT: Before enabling the private application, replace or block every
 * unguarded legacy global function, including getServerData,
 * getUniqueColumnValues, getCombinedDashboardData, addRecord and updateRecord.
 * Merely adding these new wrappers does not secure the old entry points.
 */
