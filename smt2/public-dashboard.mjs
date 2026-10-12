/**
 * Public, aggregate-only SMT2 snapshot validator.
 * This code must never fetch Apps Script directly or accept case-level data.
 */
export const SNAPSHOT_SCHEMA_VERSION = 1;
const safeInteger = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
const plainObject = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const permitted = (obj, keys) => Object.keys(obj).every(k => keys.includes(k));
const safeLabel = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 80 && !/[<>\x00-\x1f\x7f]/.test(value);
const isoDate = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(value + 'T00:00:00Z'); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value; };
export function validatePublicSnapshot(s) {
 if (!plainObject(s) || !permitted(s, ['schemaVersion','approvedForPublic','asOf','approvedOn','summary','byStatus','byGroup'])) return false;
 if (s.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || s.approvedForPublic !== true || !isoDate(s.asOf) || !isoDate(s.approvedOn)) return false;
 if (s.approvedOn < s.asOf || s.approvedOn > new Date().toISOString().slice(0,10)) return false;
 if (!plainObject(s.summary) || !permitted(s.summary,['totalRecords','completedRecords','pendingRecords'])) return false;
 const {totalRecords,completedRecords,pendingRecords}=s.summary;
 if (![totalRecords,completedRecords,pendingRecords].every(safeInteger) || completedRecords+pendingRecords !== totalRecords) return false;
 if (!Array.isArray(s.byStatus) || !Array.isArray(s.byGroup) || s.byStatus.length > 20 || s.byGroup.length > 20) return false;
 const validRows = rows => rows.every(row=>plainObject(row) && permitted(row,['label','count']) && safeLabel(row.label) && safeInteger(row.count)) && new Set(rows.map(row=>row.label.toLocaleLowerCase('th-TH'))).size===rows.length;
 if (!validRows(s.byStatus) || !validRows(s.byGroup)) return false;
 if (totalRecords > 0 && (!s.byStatus.length || !s.byGroup.length)) return false;
 // Do not publish small breakdown cells that could identify individuals.
 if ([...s.byStatus,...s.byGroup].some(row => row.count > 0 && row.count < 5)) return false;
 if (s.byStatus.reduce((n,r)=>n+r.count,0)!==totalRecords || s.byGroup.reduce((n,r)=>n+r.count,0)!==totalRecords) return false;
 return true;
}
export function formatCount(n) { return new Intl.NumberFormat('th-TH').format(n); }
export function renderSnapshot(snapshot, root) {
 if (!validatePublicSnapshot(snapshot)) throw new Error('INVALID_PUBLIC_SNAPSHOT');
 root.replaceChildren();
 const heading=document.createElement('p');
 heading.className='muted';
 heading.textContent='ข้อมูล ณ วันที่ '+snapshot.asOf+' • อนุมัติเผยแพร่ '+snapshot.approvedOn;
 root.append(heading);
 const stats=document.createElement('div'); stats.className='grid';
 for (const [label,value] of [['จำนวนเรื่องทั้งหมด',snapshot.summary.totalRecords],['ดำเนินการเสร็จแล้ว',snapshot.summary.completedRecords],['อยู่ระหว่างดำเนินการ',snapshot.summary.pendingRecords]]) {
  const card=document.createElement('div');card.className='stat';
  const name=document.createElement('span');name.textContent=label;
  const number=document.createElement('strong');number.textContent=formatCount(value);
  card.append(name,number);stats.append(card);
 }
 root.append(stats);
 for (const [title,rows] of [['จำแนกตามสถานะ',snapshot.byStatus],['จำแนกตามกลุ่มงาน',snapshot.byGroup]]) {
  const section=document.createElement('section');section.className='panel';
  const h=document.createElement('h3');h.textContent=title;section.append(h);
  const list=document.createElement('ul');
  for (const row of rows) {const li=document.createElement('li');li.textContent=row.label+' — '+formatCount(row.count);list.append(li);}
  section.append(list);root.append(section);
 }
}
