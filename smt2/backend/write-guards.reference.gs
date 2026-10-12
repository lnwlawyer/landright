/**
 * SMT2 Apps Script write-guard reference.
 * REVIEW ONLY: not deployed, and does not replace the existing Code.gs automatically.
 *
 * Requires Script Properties:
 * SMT2_EDITOR_EMAILS = comma-separated permitted Google Workspace accounts
 *
 * IMPORTANT: Session.getActiveUser().getEmail() can be blank depending on
 * Apps Script deployment and account context. Fail closed when blank.
 * Never expose this file as a public execute-as-owner write endpoint.
 */
function smt2AuthorizedEditor_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const configured = PropertiesService.getScriptProperties().getProperty('SMT2_EDITOR_EMAILS') || '';
  const allowed = configured.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) throw new Error('NOT_AUTHORIZED');
}

function smt2EditableSheet_(sheetName) {
  const name = String(sheetName || '').trim();
  if (!name || !getSheetNames().includes(name)) throw new Error('SHEET_NOT_ALLOWED');
  const sheet = SS.getSheetByName(name);
  if (!sheet) throw new Error('SHEET_NOT_FOUND');
  return sheet;
}

function smt2SafeUpdateRecord(recordInfo) {
  smt2AuthorizedEditor_();
  if (!recordInfo || !Number.isSafeInteger(recordInfo.rowIndex) || recordInfo.rowIndex < 2) {
    throw new Error('INVALID_ROW');
  }
  const sheet = smt2EditableSheet_(recordInfo.sheetName);
  if (!Array.isArray(recordInfo.newValues)) throw new Error('INVALID_VALUES');
  const lock = LockService.getDocumentLock();
  if (!lock || !lock.tryLock(10000)) throw new Error('BUSY_RETRY');
  try {
    const columnCount = sheet.getLastColumn();
    if (recordInfo.newValues.length !== columnCount) throw new Error('COLUMN_MISMATCH');
    if (recordInfo.rowIndex > sheet.getLastRow()) throw new Error('ROW_NOT_FOUND');
    // Require the client to supply the exact row values it originally read.
    // Reject stale edits rather than overwriting someone else's changes.
    if (!Array.isArray(recordInfo.expectedValues) || recordInfo.expectedValues.length !== columnCount) {
      throw new Error('EXPECTED_VALUES_REQUIRED');
    }
    const current = sheet.getRange(recordInfo.rowIndex, 1, 1, columnCount).getDisplayValues()[0];
    if (JSON.stringify(current) !== JSON.stringify(recordInfo.expectedValues.map(String))) {
      throw new Error('CONFLICT_RELOAD_REQUIRED');
    }
    sheet.getRange(recordInfo.rowIndex, 1, 1, columnCount).setValues([recordInfo.newValues]);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function smt2SafeAddRecord(recordInfo) {
  smt2AuthorizedEditor_();
  if (!recordInfo || !Array.isArray(recordInfo.rowData)) throw new Error('INVALID_VALUES');
  const sheet = smt2EditableSheet_(recordInfo.sheetName);
  const lock = LockService.getDocumentLock();
  if (!lock || !lock.tryLock(10000)) throw new Error('BUSY_RETRY');
  try {
    if (recordInfo.rowData.length !== sheet.getLastColumn()) throw new Error('COLUMN_MISMATCH');
    sheet.appendRow(recordInfo.rowData);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}
