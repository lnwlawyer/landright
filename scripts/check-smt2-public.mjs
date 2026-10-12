import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {validatePublicSnapshot} from '../smt2/public-dashboard.mjs';

const path=resolve('smt2/approved-summary.json');
if (!existsSync(path)) {
 console.log('SMT2 publication gate: no approved snapshot; safe empty state.');
 process.exit(0);
}
let snapshot;
try {snapshot=JSON.parse(readFileSync(path,'utf8'));}
catch {console.error('SMT2 publication gate: malformed JSON');process.exit(1);}
if (!validatePublicSnapshot(snapshot)) {
 console.error('SMT2 publication gate: snapshot schema, approval or privacy rule failed');
 process.exit(1);
}
console.log('SMT2 publication gate: approved aggregate snapshot validated.');
