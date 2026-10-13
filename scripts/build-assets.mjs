import {spawnSync} from 'node:child_process';
import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('assets',{recursive:true});
const result = spawnSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-c','tailwind.config.cjs','-i','scripts/tailwind-input.css','-o','assets/landright.css','--minify'],{stdio:'inherit'});
if(result.status !== 0) process.exit(result.status ?? 1);
const chart=readFileSync('node_modules/chart.js/dist/chart.umd.min.js','utf8');
writeFileSync('assets/chart.js',chart.replace(/\/\/# sourceMappingURL=.*$/m,'').trimEnd()+'\n');
copyFileSync('node_modules/chart.js/LICENSE.md','assets/chart-LICENSE.md');
copyFileSync('node_modules/tailwindcss/LICENSE','assets/tailwind-LICENSE.txt');
