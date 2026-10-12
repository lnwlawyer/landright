import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {validatePublicSnapshot} from '../smt2/public-dashboard.mjs';

const filename=resolve('smt2/approved-summary.json');
const MAX_BYTES=16384;
export const forbiddenTerms=/เลขบัตร|บัตรประชาชน|เลขโฉนด|โฉนด|โทรศัพท์|เบอร์โทร|อีเมล|email|phone|address|ชื่อผู้|เลขคดี|case.?id|record.?id|row.?index|sheet.?name|เลขประจำตัว|เจ้าหน้าที่|พนักงาน|ที่อยู่/i;
export function inspectPublication(raw) {
 const errors=[];
 if(Buffer.byteLength(raw,'utf8')>MAX_BYTES) errors.push('File exceeds 16 KiB');
 if(forbiddenTerms.test(raw)) errors.push('Potential identifying field or label');
 let data;
 try {data=JSON.parse(raw);} catch {errors.push('Malformed JSON');return errors;}
 if(!validatePublicSnapshot(data)) errors.push('Unapproved or invalid aggregate snapshot');
 if(data && typeof data==='object' && data.approvedForPublic===true) {
  if(data.summary?.totalRecords < 5 && data.summary?.totalRecords > 0) errors.push('Small total requires suppression');
 }
 return errors;
}
if(process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 if(!existsSync(filename)){console.log('SMT2 release preflight: no public snapshot; no data released.');process.exit(0);}
 const errors=inspectPublication(readFileSync(filename,'utf8'));
 if(errors.length){for(const error of errors)console.error('SMT2 release preflight:',error);process.exit(1);}
 console.log('SMT2 release preflight: machine checks passed. Human disclosure review still required.');
}
