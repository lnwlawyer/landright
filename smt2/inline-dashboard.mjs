import {validatePublicSnapshot,formatCount} from './public-dashboard.mjs';

export const SMT2_SNAPSHOT_PATH = './smt2/approved-summary.json';
export const SMT2_MAX_BYTES = 16384;
export const SMT2_TIMEOUT_MS = 10000;
export function safePublicUrl(url) {
 const parsed = new URL(url, window.location.href);
 return parsed.origin === window.location.origin && parsed.pathname.endsWith('/smt2/approved-summary.json');
}
export function describeSnapshot(data) {
 if (!validatePublicSnapshot(data)) throw new Error('UNAPPROVED');
 return {
  cards: [['จำนวนเรื่องทั้งหมด',data.summary.totalRecords],['ดำเนินการเสร็จแล้ว',data.summary.completedRecords],['อยู่ระหว่างดำเนินการ',data.summary.pendingRecords]],
  breakdowns: [['จำแนกตามสถานะ',data.byStatus],['จำแนกตามกลุ่มงาน',data.byGroup]],
  asOf: data.asOf,
  approvedOn: data.approvedOn
 };
}
export async function fetchApprovedSnapshot(fetcher=fetch, signal) {
 const url = new URL(SMT2_SNAPSHOT_PATH,window.location.href);
 if (!safePublicUrl(url.href)) throw new Error('INVALID_URL');
 const response = await fetcher(url.href,{cache:'no-store',credentials:'omit',signal,redirect:'error'});
 if (!response.ok || Number(response.headers.get('content-length')||0)>SMT2_MAX_BYTES) throw new Error('UNAVAILABLE');
 const text = await response.text();
 if (text.length>SMT2_MAX_BYTES) throw new Error('TOO_LARGE');
 return describeSnapshot(JSON.parse(text));
}
export function renderInlineDashboard(root,description) {
 root.replaceChildren();
 const grid=document.createElement('div');
 grid.className='grid grid-cols-1 md:grid-cols-3 gap-4';
 for(const [label,value] of description.cards){
  const card=document.createElement('div');
  card.className='rounded-lg border border-slate-200 p-4';
  const caption=document.createElement('p');caption.className='text-sm text-gray-600';caption.textContent=label;
  const number=document.createElement('p');number.className='mt-2 text-2xl font-bold text-gray-900';number.textContent=formatCount(value);
  card.append(caption,number);grid.append(card);
 }
 root.append(grid);
 for(const [title,rows] of description.breakdowns){
  const section=document.createElement('section');section.className='mt-4 rounded-lg border border-slate-200 p-4';
  const heading=document.createElement('h4');heading.className='font-semibold text-gray-800 mb-2';heading.textContent=title;
  const list=document.createElement('ul');list.className='space-y-2 text-sm text-gray-700';
  for(const item of rows){const li=document.createElement('li');li.textContent=item.label+' — '+formatCount(item.count);list.append(li);}
  section.append(heading,list);root.append(section);
 }
}
export function createInlineController({root,status,button,meta,fetcher=fetch}){
 let busy=false, loaded=false;
 async function load(force=false){
  if(busy || (loaded && !force)) return;
  busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
  status.textContent='กำลังตรวจสอบข้อมูลสรุปที่ได้รับอนุมัติ...';
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),SMT2_TIMEOUT_MS);
  try {
   const description=await fetchApprovedSnapshot(fetcher,abort.signal);
   renderInlineDashboard(root,description);
   status.textContent='ข้อมูลสรุปที่ได้รับอนุมัติเผยแพร่';
   meta.textContent='ข้อมูล ณ วันที่ '+description.asOf+' • อนุมัติเผยแพร่ '+description.approvedOn;
   loaded=true;
  } catch {
   // On refresh failure, do not retain potentially outdated figures.
   root.replaceChildren();
   status.textContent='ยังไม่มีชุดข้อมูลสรุป SMT2 ที่ได้รับการอนุมัติให้เผยแพร่';
   meta.textContent='ไม่สามารถยืนยันข้อมูลที่เผยแพร่ล่าสุดได้';
   loaded=false;
  } finally {
   clearTimeout(timeout);busy=false;button.disabled=false;button.removeAttribute('aria-busy');
  }
 }
 button.addEventListener('click',()=>load(true));
 return {load};
}
