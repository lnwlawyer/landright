/**
 * Private LandRight data source for the eleven legacy menu datasets.
 * This module NEVER fetches private data without a Google OAuth access token.
 * No data is persisted, published or copied to a public endpoint.
 */
export const MENU_SHEETS = Object.freeze({
  section93: 'มาตรา 93',
  section96: 'มาตรา 96 ทวิ',
  boi: 'BOI',
  commercial: 'เช่าเพื่อพาณิชยกรรม',
  temple: 'วัด',
  mosque: 'มัสยิด',
  christian: 'มูลนิธิคริสต์',
  catholic: 'วัดคาทอลิก',
  abandoned: 'ที่ดินทอดทิ้ง',
  securities: 'ตรวจสอบหลักทรัพย์',
  docSearch: 'ค้นหาเอกสาร',
});
export const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
export function rowsToObjects(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const headers = values[0].map(v => String(v ?? '').trim());
  return values.slice(1).filter(row => Array.isArray(row) && row.some(v => String(v ?? '').trim())).map(row => {
    const result = Object.create(null);
    headers.forEach((header, index) => {
      // Ignore unnamed and duplicate headers; preserve the first named column.
      if (header && !['__proto__','prototype','constructor'].includes(header) && !Object.hasOwn(result,header)) {
        result[header] = String(row[index] ?? '');
      }
    });
    return result;
  });
}
export async function readMenuSheet({spreadsheetId, accessToken, menuId, signal, fetchImpl=fetch}) {
  const sheet = MENU_SHEETS[menuId];
  if (!sheet) throw new Error('ไม่พบเมนูข้อมูลที่ร้องขอ');
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId ?? '')) throw new Error('รหัส Google Sheets ไม่ถูกต้อง');
  if (!accessToken) throw new Error('กรุณาเข้าสู่ระบบ Google ที่ได้รับสิทธิ์');
  const url = new URL('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId)+'/values/'+encodeURIComponent("'"+sheet+"'"));
  url.searchParams.set('valueRenderOption','FORMATTED_VALUE');
  const response = await fetchImpl(url.href,{method:'GET',headers:{Authorization:'Bearer '+accessToken},signal,cache:'no-store',credentials:'omit',redirect:'error'});
  if (!response.ok) {
    const messages={401:'เซสชันหมดอายุ',403:'บัญชีไม่มีสิทธิ์อ่าน Google Sheets',404:'ไม่พบแท็บหรือไฟล์ Google Sheets'};
    throw new Error(messages[response.status] || 'ไม่สามารถอ่านข้อมูลได้ ('+response.status+')');
  }
  const json=await response.json();
  if (!json || !Array.isArray(json.values)) return [];
  return rowsToObjects(json.values);
}
/** Public visitors must only see a separately reviewed, non-sensitive publication. */
export function validatePublicSummary(summary) {
  if (!summary || typeof summary !== 'object' || !Array.isArray(summary.menus)) return [];
  return summary.menus.filter(item => typeof item?.menuId === 'string' &&
    Object.hasOwn(MENU_SHEETS,item.menuId) &&
    Number.isSafeInteger(item.count) && item.count >= 0)
    .map(({menuId,count})=>({menuId,count}));
}
