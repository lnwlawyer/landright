/**
 * Pure SMT2 authorization contract for offline tests and migration review.
 * Not a deployed API and never a substitute for server-side authorization.
 */
export const BLOCKED_SHEETS = Object.freeze(['Config','OrgChart','กลุ่มต่างด้าว','กลุ่มศาสนา']);
export const MAX_PAGE = 10000;
export const MAX_LIMIT = 50;

export function normalizeEmail(value) {
 if (typeof value !== 'string') return '';
 const email=value.trim().toLowerCase();
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}
export function permittedRole(email, role, readers, editors) {
 const principal=normalizeEmail(email);
 if (!principal || !['reader','editor'].includes(role)) return false;
 const parse=list=>typeof list==='string' ? list.split(',').map(normalizeEmail).filter(Boolean) : [];
 const writers=parse(editors);
 return writers.includes(principal) || (role==='reader' && parse(readers).includes(principal));
}
export function allowedSheet(name, names) {
 return typeof name==='string' && name.length>0 && name===name.trim() &&
  Array.isArray(names) && !BLOCKED_SHEETS.includes(name) && names.includes(name);
}
export function validPage(page,limit) {
 return Number.isSafeInteger(page) && page>=1 && page<=MAX_PAGE &&
  Number.isSafeInteger(limit) && limit>=1 && limit<=MAX_LIMIT;
}
export function projectColumns(headers,configured) {
 if (!Array.isArray(headers) || typeof configured!=='string') throw new Error('INVALID_COLUMNS');
 const columns=configured.split(',').map(x=>x.trim()).filter(Boolean);
 if (!columns.length || new Set(columns).size!==columns.length) throw new Error('COLUMN_NOT_ALLOWED');
 const positions=columns.map(column=>{
  const first=headers.indexOf(column);
  if(first<0 || headers.lastIndexOf(column)!==first) throw new Error('COLUMN_NOT_ALLOWED');
  return first;
 });
 return {columns,positions};
}
export function projectRows(rows,positions) {
 if(!Array.isArray(rows)||!Array.isArray(positions)) throw new Error('INVALID_ROWS');
 return rows.map(row=>positions.map(i=>String(row[i]??'')));
}
