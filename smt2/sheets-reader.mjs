export const STAFF_SHEETS = Object.freeze(['การะเกด','ชยาน์ขวัญ','ฉัตรพร','ภทรพงค์','สกุลวรรณ','ปิยะพงษ์','เทอดพงศ์','โสภา']);
export const READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
export const normalize = value => String(value ?? '').normalize('NFKC').replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toLocaleLowerCase('th');
const aliases = {
  province: ['จังหวัด','จังหวัดที่ตั้ง','province'],
  subject: ['เรื่อง','ชื่อเรื่อง','เรื่องที่ดำเนินการ','subject','title'],
  reference: ['เลขที่หนังสือ','เลขหนังสือ','เลขที่รับ','เลขรับ','เลขที่เรื่อง','reference'],
  officer: ['เจ้าหน้าที่รับผิดชอบ','ผู้รับผิดชอบ','เจ้าหน้าที่','ผู้ดำเนินการ','officer'],
  status: ['สถานะปัจจุบัน','สถานะ','สถานะดำเนินการ','สถานะการดำเนินการ','status'],
};
export function parseSheet(values, sheet) {
  if (!Array.isArray(values) || !values.length) return {records:[], missing:[]};
  if (!values.every(row => Array.isArray(row) && row.every(v => ['string','number','boolean'].includes(typeof v)))) throw new Error('รูปแบบข้อมูลชีตไม่ถูกต้อง');
  const rawHeaders = values[0].map(v=>String(v ?? '').trim());
  const headers = rawHeaders.map(normalize);
  const nonEmptyHeaders = headers.filter(Boolean);
  if (new Set(nonEmptyHeaders).size !== nonEmptyHeaders.length) {
  throw new Error('ชื่อคอลัมน์ซ้ำกัน');
}
  const columns = Object.fromEntries(Object.entries(aliases).map(([key, names]) => {
    const matches = headers.flatMap((h, i) =>
      names.map(normalize).includes(h) ? [i] : []
    );
    const preferred = names.map(normalize)
      .map(name => headers.indexOf(name))
      .find(i => i >= 0);
    return [key, preferred ?? -1];
  }));
  const missing = Object.keys(columns).filter(k => columns[k] < 0);
  const records = values.slice(1).filter(row => row.some(v => String(v).trim())).map(row => ({
    sheet,
    columns: Object.fromEntries(rawHeaders.map((header,i)=>[header || 'คอลัมน์ '+(i+1), String(row[i] ?? '')])),
    ...Object.fromEntries(Object.entries(columns).map(([k, i]) => [k, i < 0 ? '' : String(row[i] ?? '')])),
  }));
  return {records, missing};
}
export function filterRecords(records, {query='', sheet='', status='', province=''}={}) {
  const q = normalize(query);
  return records.filter(r => (!sheet || r.sheet === sheet) && (!status || (r.status || 'ไม่ระบุสถานะ') === status) && (!province || r.province === province) && (!q || Object.values(r).some(v => normalize(v).includes(q))));
}
export function summarize(records) {
  const counts = key => Object.entries(records.reduce((a, r) => {
    const value = r[key] || (key === 'status' ? 'ไม่ระบุสถานะ' : 'ไม่ระบุ');
    a[value] = (a[value] || 0) + 1; return a;
  }, Object.create(null))).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'th'));
  return {total:records.length, byStatus:counts('status'), bySheet:counts('sheet')};
}
export async function readStaffSheets({spreadsheetId, accessToken, signal, fetchImpl=fetch}) {
  if (!accessToken) throw new Error('กรุณาเข้าสู่ระบบก่อนอ่านข้อมูล');
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId || '')) throw new Error('รหัส Google Sheets ไม่ถูกต้อง');
  // Open-ended ranges avoid silently dropping records after row 1000 or column Z.
  const url = new URL('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId) + '/values:batchGet');
  for (const sheet of STAFF_SHEETS) url.searchParams.append('ranges', "'" + sheet.replace(/'/g,"''") + "'");
  url.searchParams.set('valueRenderOption','FORMATTED_VALUE');
  const response = await fetchImpl(url.href, {method:'GET', headers:{Authorization:'Bearer '+accessToken}, signal, cache:'no-store', credentials:'omit', redirect:'error'});
  if (!response.ok) {
    const messages = {401:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',403:'Google ปฏิเสธการอ่าน: ตรวจสิทธิ์ไฟล์ การเปิด Sheets API และนโยบาย OAuth',404:'ไม่พบไฟล์ Google Sheets หรือบัญชีไม่มีสิทธิ์',429:'Google จำกัดจำนวนคำขอ กรุณาลองใหม่ภายหลัง'};
    throw new Error(messages[response.status] || 'อ่านข้อมูลไม่สำเร็จ ('+response.status+')');
  }
  let json;
  try { json = await response.json(); }
  catch { throw new Error('Google ส่งข้อมูลที่ไม่ใช่ JSON ที่ถูกต้อง'); }
  if (!json || typeof json !== 'object') throw new Error('รูปแบบข้อมูลจาก Google ไม่ถูกต้อง');
  if (!Array.isArray(json.valueRanges) || json.valueRanges.length !== STAFF_SHEETS.length) throw new Error('ได้รับข้อมูลไม่ครบทั้ง 8 ชีต');
  const records = [], warnings = [];
  json.valueRanges.forEach((range, i) => {
    // Validate identities rather than trusting array positions alone.
    if (!range || typeof range.range !== 'string') throw new Error('ข้อมูลไม่มีชื่อชีต');
    const actual = range.range.split('!')[0].replace(/^'|'$/g,'').replace(/''/g,"'");
    if (actual !== STAFF_SHEETS[i]) throw new Error('ชื่อหรือเรียงลำดับชีตไม่ตรงตามที่ร้องขอ');
    const parsed = parseSheet(range.values ?? [], actual);
    records.push(...parsed.records);
    if (parsed.missing.length) warnings.push(actual + ': ' + parsed.missing.join(', '));
  });
  return {records, warnings};
}
