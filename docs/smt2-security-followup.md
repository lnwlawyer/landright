# LandRight–SMT2: ผลตรวจต่อเนื่องด้าน Dependency และ Acceptance

วันที่ตรวจ: **13 ตุลาคม 2569 (Asia/Bangkok)**
Repository: `lnwlawyer/landright` — Branch: `feature/smt2-private-sheets-oauth`
[PR #43](https://github.com/lnwlawyer/landright/pull/43)

**NOT READY FOR DEPLOY** — Automated checks และ Actions ผ่านแล้ว
แต่ยังไม่ตรวจ OAuth Console, สิทธิ์ไฟล์ และข้อมูลทั้ง 8 ชีตด้วยบัญชี Google จริง
ไม่มีการ Merge/Deploy หรือแก้ไข Production Sheets

## SHA และขอบเขตหลักฐาน

- ก่อนเริ่ม: `e3652c4be228cb552392821279585922ee60a887`
  Local/remote branch/PR head ตรงกัน และ working tree สะอาด
- Code ที่ตรวจรอบนี้: **`179552e0df7b9976b41fc8c87fd18ef7907c1ebd`**
  Dependency migration อยู่ที่ `0a5800d`; การรอ fixture/ควบคุมเวลาอยู่ที่ `c6bd393`;
  การเปรียบเทียบพิกเซลที่ถอดรหัสและ diagnostics อยู่ที่ `b6fa287`;
  การตรวจ DOM/layout/color ที่เข้มขึ้นพร้อมข้อจำกัด noise อยู่ที่ `179552e`
- การทดสอบในเครื่องรันกับ code tree ที่ถูก Commit เป็น SHA นี้
  ผล local ล่าสุดยังเป็น 74 Node + 68 Browser ผ่านทั้งหมด
  การเปลี่ยนถัดจาก SHA นี้เป็นการปรับรายงาน/หลักฐาน audit เท่านั้น
- เอกสารฉบับนี้และลิงก์ README ถูกบันทึกใน documentation commit ถัดมา
  SHA ของ documentation commit ดูได้จากประวัติ PR; ไม่มีการอ้างว่าไฟล์นี้รู้ SHA ของตัวเอง

## แก้ Dependency Advisories ครบทั้ง 7 รายการ

เดิม npm รายงาน **7 package findings จาก 2 root advisories**
ไม่ใช่ช่องโหว่ที่เป็นอิสระต่อกัน 7 ช่อง รายละเอียดก่อน/หลังและ URL หลักฐานอยู่ใน
[ผล audit JSON](smt2-dependency-audit-evidence.json)

| Package ที่เดิมถูกแจ้ง | Severity | วิธีแก้ |
| --- | --- | --- |
| braces | High | นำ dependency chain ออกจาก build toolchain |
| chokidar | High | นำ Tailwind 3 watcher chain ออก |
| fast-glob | High | นำ Tailwind 3 glob chain ออก |
| micromatch | High | นำ glob/watcher dependency ที่ใช้ braces ออก |
| tailwindcss 3.4.19 | High (transitive) | ย้ายเป็น Tailwind 4.3.3 |
| postcss-selector-parser | Moderate | นำ Tailwind 3/PostCSS nested chain ออก |
| postcss-nested | Moderate (transitive) | ใช้ official Tailwind 4 PostCSS plugin แทน |

ใช้ `@tailwindcss/postcss` **4.3.3**, `tailwindcss` **4.3.3** และ
`postcss` **8.5.30** ล็อกเวอร์ชันตรงและ lockfile พร้อม integrity checks
ไม่มี `audit fix --force`, ไม่มีการตัด dev dependencies ออกจาก audit,
ไม่มี ignore/advisory suppression และไม่เปลี่ยน TLS/checksum verification
CI เพิ่ม **`npm audit` แบบเต็ม** ซึ่งทำให้ workflow ล้มเหลวเมื่อมี finding

ตรวจทางเลือกก่อนเลือก: CLI 4.3.3 ยังนำ @parcel/watcher → micromatch → braces
กลับเข้ามา (4 High) จึงไม่ใช้ CLI และเปลี่ยนเป็น official PostCSS API
PostCSS 8.5.16 ที่ plugin ยอมรับยังมี advisory ใหม่ จึงอัปเดต patch เป็น 8.5.30
ผลสุดท้าย **0 Info / 0 Low / 0 Moderate / 0 High / 0 Critical**
ไม่มีรายการเดิมที่ต้องยอมรับ risk exception แทนการแก้ไข

## Risk assessment และมาตรการ

**GHSA-vfj7-8cjw-p6xm** — braces stack-exhaustion DoS (High, CVSS 7.5):
pattern ที่ซ้อนลึกอาจทำให้ build process stack overflow/หยุดทำงาน
เดิมอยู่ในเครื่องมือ build/glob/watch ไม่อยู่ใน JavaScript ที่เสิร์ฟให้ผู้ใช้
เงื่อนไขโจมตีต้องนำ pattern/source/config ที่ผู้โจมตีควบคุมเข้าสู่ pipeline
ไม่ใช่การส่งข้อมูล Google Sheets แล้วเรียก braces ในเว็บ
ไม่มี patch ที่เหมาะสมในสายเดิม ณ การตรวจ แต่มีการเปลี่ยน toolchain ที่ปลอดภัย
จึงเอา dependency ออกแทนการยอมรับความเสี่ยงหรือแอบปิด audit

**GHSA-rj75-hqrm-r3gf** — PostCSS selector parsing CPU exhaustion
(Moderate, CVSS 5.9): selector ที่ยาว/ผิดปกติอาจทำให้ CPU ใช้งานสูงใน build
ขอบเขตเดิมคือ CSS/config ที่ compiler ประมวลผล ไม่ใช่ API endpoint ของเว็บ
นำ selector-parser/nested chain เดิมออกและใช้ PostCSS patch ที่ audit ผ่าน

[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) ·
[selector advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) ·
[Tailwind 4 changelog](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/CHANGELOG.md)

มาตรการที่ยังคงใช้: compiler อ่านเฉพาะ source ที่ประกาศ (`index.html`, `smt2.js`),
ปิด automatic source discovery ด้วย `source(none)` เพื่อไม่ให้ generated outputs,
fixtures หรือไฟล์อื่นปนกับ build, ตรวจ PR/config ก่อนรัน, frozen install จาก lockfile,
ตรวจ asset build ซ้ำ และ audit ทั้ง dependency tree ใน CI
การจำกัด source เป็นการจำกัด input build ไม่ใช่การปิดการตรวจความปลอดภัย

**ความเสี่ยง compatibility จาก major upgrade:** เก็บ palette, font metrics,
radius/shadow และ static reset เดิมใน `styles/legacy-*` และคง cascade ของ utilities
เพื่อไม่ให้สีหัวตาราง/น้ำหนักตัวอักษรถูก inline global CSS เปลี่ยน
แก้ gradient ให้ใช้ sRGB และคง opacity ของ mobile overlay
stylesheet Tailwind 3 ใน test fixture เป็น reference CSS เท่านั้น
ไม่มี Tailwind 3 compiler, braces หรือ selector parser เดิมติดตั้ง/เสิร์ฟ
เปรียบเทียบ rendered pixels ก่อน/หลังใน Chromium เดียวกันทุก view ที่ทดสอบ

Tailwind 4 ต้องใช้ modern browsers; ผู้ดูแลต้องตรวจ browser จริงของหน่วยงาน
โดยเฉพาะอุปกรณ์เก่า ตามคู่มือบัญชีจริง หาก browser ต่ำกว่าเกณฑ์รองรับ
ให้ถือว่า compatibility ยังไม่ผ่านและห้ามสรุป READY

**ความเสี่ยงสิทธิ์ข้อมูลที่ยังไม่ปิด:** Google Sheets เป็น file-level ACL
บัญชีที่มีสิทธิ์ไฟล์อ่านทุกแท็บผ่าน API ได้ การซ่อนเมนู/filter/projection ใน UI
ไม่ได้บังคับบทบาท admin หรือสิทธิ์ระดับแท็บ และ protected/hidden tabs ไม่ปิดการอ่าน
owner ต้องตรวจ Restricted sharing, groups/inherited access และ Publish to web
แยกจากกัน ก่อนรับรองว่า non-admin ไม่มีสิทธิ์อ่านข้อมูล

## ผลรันทดสอบจริง

เครื่อง: Node.js 24.19.0, npm 11.9.0, Python 3.12.14,
Chromium 154.0.8037.57 และ Playwright 1.56.1

| คำสั่ง/ตรวจ | ผล |
| --- | --- |
| `npm ci` จาก lockfile | ผ่าน |
| `npm audit --json` ทั้ง dependencies | Exit 0, **0 findings** |
| `npm run build:assets` + rebuild/diff assets | ผ่าน, output เดิมซ้ำได้ |
| `npm test` | **74 Passed / 0 Failed** |
| `SMT2_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` | **68 Passed / 0 Failed** |
| public snapshot gate + release preflight | ผ่าน; ไม่มี approved snapshot เป็น safe empty state |
| `git diff --cached --check` | ผ่าน |

รวม **142 Passed / 0 Failed**, skipped/cancelled **0**
ไม่รวม build/audit/snapshot checks ซึ่งไม่มีจำนวน test cases

Browser tests 68 = 40 functional/security cases ใน desktop/mobile viewports
และ 28 pixel comparison cases (14 views x 2 viewports)
ใช้ CSS/Chart.js ภายในจริง แต่ Google OAuth/Sheets/CSV/network เป็นข้อมูลจำลองทั้งหมด
viewports คือ 1280×800 และ 390×844 ไม่ใช่การทดสอบมือถือจริงหรือทุก browser

ตรวจครบเมนู Overview, Foreigners และ 4 subtabs, Religious และ 4 subtabs,
Abandoned, Users, Settings, SMT2 และ navigation overlay ขณะเปิด
เพิ่มการรับ synthetic CSV ทั้ง **11 feeds** ตรวจตาราง/ยอดรวมและ Chart.js data
ไม่มี page errors; unit regression ยืนยัน hash ของ URL เดิมทั้ง 11 แหล่งไม่เปลี่ยน

SMT2 ยังผ่านการอ่าน 8 ranges, header aliases, แถวเกิน 1,000,
search/filter/dashboard/pagination, escaping, readonly GET, anonymous ไม่มี request,
OAuth errors, API 401/403/404/429/500, network failure, logout/expiry และ late responses
ไม่ได้ยิง private Production API หรืออ่านข้อมูลรายเรื่องจริงระหว่าง automated tests

## GitHub Actions

ตรวจผ่านหน้า Checks/Actions สาธารณะ หลัง REST/GraphQL API ถูก proxy ปฏิเสธ
ไม่ได้ขอ token เพิ่มหรือใช้การปฏิเสธ API เป็นเหตุสรุปว่า Actions เสีย

- SHA ก่อนเริ่ม `e3652c4`: [run 38413967800](https://github.com/lnwlawyer/landright/actions/runs/38413967800)
  **Success**
- SHA ที่แก้ไข `0a5800d`: [run 38416779445](https://github.com/lnwlawyer/landright/actions/runs/38416779445)
  **Success**, workflow `LandRight checks`, job `test`, total duration 58s
  Checks page ผูก selected SHA กับ `0a5800d6d57c49c1bbb9230c6110d86d1773014f`

workflow รัน Node 22, full audit, build verification, unit/regression,
public preflight และ browser tests ผล hosted Actions ไม่ได้อาศัยผล local แทน
รันระหว่างทางที่ล้มเหลวไม่ได้ถูกตัดออกจากรายงาน:

- `d43e22f`: [run 38417250622](https://github.com/lnwlawyer/landright/actions/runs/38417250622)
  **Failure** ที่ browser step; install/audit/build/unit/preflight ผ่าน
  endpoint log ของ GitHub ตอบ 404 ต่อ session สาธารณะ จึงไม่ทราบชื่อ testcase
- `c6bd393`: [run 38418164110](https://github.com/lnwlawyer/landright/actions/runs/38418164110)
  **Failure**, GitHub reporter ยืนยัน **66 Passed / 2 Failed**
  เป็น visual comparison ของ desktop SMT2 และ mobile viewport BOI;
  functional/security cases ผ่าน ไม่มี test ถูก skip หรือ retries
- `b6fa287`: [run 38418834608](https://github.com/lnwlawyer/landright/actions/runs/38418834608)
  **Failure**, **67 Passed / 1 Failed** เป็น mobile viewport BOI
  diagnostics ยืนยันต่าง **4 pixels**, max channel delta **1/255**
  พิกเซลแรกอยู่ที่ขอบปุ่ม `smt2-admin-entry` ไม่ใช่ข้อมูล/ตารางหรือสิทธิ์ API
- `179552e`: [run 38420446223](https://github.com/lnwlawyer/landright/actions/runs/38420446223)
  **Success**, total duration **1m 7s**; GitHub Run Summary ยืนยัน
  **68 Browser Passed** (28.6s) และทุกขั้นก่อนหน้า audit/build/unit/preflight ผ่าน

ปรับ test ให้รอ render ของ CSV แหล่งสุดท้ายจริง และใช้ browser clock จำลอง expiry
แทนการแข่งกับเซสชัน 1 วินาที เพิ่ม GitHub reporter เพื่ออ่าน failure annotations
โดยไม่ต้องเข้าถึง private logs และแก้การเทียบ PNG bytes ให้ถอดรหัสเป็น RGBA
แล้วตรวจพิกเซลจริงด้วย `pngjs` 7.0.0 พร้อมจำนวน/ตำแหน่ง/ค่าที่ต่าง
ผล diagnostic ในเครื่องพบ noise อีกครั้ง **17 pixels**, delta **1/255**
บนมุมโค้งของปุ่มเดียวกัน ขณะ DOM metrics/color checks ตรงกันทั้งหมด
จึงไม่ถือว่าการเทียบไฟล์ PNG bytes หรือ exact raster bytes เป็น acceptance ที่เหมาะสม

เกณฑ์ visual สุดท้ายตรวจ visible DOM ทุก node ให้ tag/id/class, ตำแหน่ง/ขนาด
(ความละเอียด 0.001 CSS pixel), สีตัวอักษร/พื้น/ขอบ, font family/size/weight,
line-height และ border-radius ตรงกับ reference
ภาพส่วนอื่นต้องตรงทุกพิกเซล อนุญาตเฉพาะ rounding noise ที่มุมโค้งของปุ่ม
`smt2-admin-entry` ไม่เกิน **32 pixels** และแต่ละ channel ต่างไม่เกิน **1/255**
ไม่มี tolerance นอกตำแหน่งนี้ หรือ tolerance ของ geometry/colors/data/security
baseline ไม่ถูกแก้, assertions ยังคงทำงาน, retries = 0 และ audit ยังเป็นศูนย์
เกณฑ์นี้มีหลักฐานเชิงปริมาณประกอบ ไม่ใช่การลดการตรวจสิทธิ์หรือความปลอดภัย
ไม่ได้สรุปว่า failure เดิมเป็น PNG metadata; diagnostics ยืนยันว่ามี pixel noise จริง

การดาวน์โหลด Playwright Chromium 141 มาตรวจในเครื่องนี้ถูก proxy ตอบ
403 Domain forbidden จึงคง local Chromium 154 พร้อมระบุข้อจำกัดนี้ และใช้ผล
hosted Actions ที่ใช้ browser ของ Playwright ประกอบ ไม่ปิด TLS หรือเปลี่ยน archive

มี warning ของ `actions/checkout@v4`/`setup-node@v4` ที่ runner เปลี่ยน bootstrap
Node 20 เป็น Node 24 และ notice เรื่อง `ubuntu-latest` จะเปลี่ยนเป็น Ubuntu 26
เป็นข้อความ platform ที่ไม่ทำให้ job ล้มเหลว ไม่ใช่ 7 npm advisories เดิม
ไม่ได้รายงานว่า workflow ไม่มี warning

## สิ่งที่ผู้ดูแลต้องทำต่อ

[คู่มือทดสอบบัญชี Google จริง](smt2-google-account-testing.md) แยกงานที่ Codex
ทำได้กับงานที่ต้องใช้เจ้าของ Project/ไฟล์ ครอบคลุม origins/API/consent,
authorized/unauthorized accounts, direct API, sharing/published CSV,
จำนวนและ schema จริงครบ 8 ชีต และ desktop/mobile จริง

Codex ยังไม่มี Google Console/session ที่ได้รับอนุญาตและไม่มีผล file ACL จริง
จึงรับรองได้เฉพาะ code/dependencies/automated behavior และ Actions ที่ระบุ
ต้องปิดผลบัญชีจริงและ browser compatibility ก่อนเปลี่ยนเป็น READY FOR DEPLOY
ไม่มีการเพิ่มบริการเสียเงิน ใช้ Apps Script เปิด sharing หรือแก้ข้อมูล Production
