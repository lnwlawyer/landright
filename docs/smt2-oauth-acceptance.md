# SMT2 OAuth Integration — รายงานตรวจรับ PR #43

> รายงานรอบแรก เก็บเพื่ออ้างอิง ผลปัจจุบันอยู่ใน
> [รายงานตรวจต่อเนื่อง](smt2-security-followup.md) และ
> [คู่มือทดสอบบัญชีจริง](smt2-google-account-testing.md)

วันที่ตรวจ: 13 ตุลาคม 2569 (Asia/Bangkok)
Repository: `lnwlawyer/landright`
Branch: `feature/smt2-private-sheets-oauth`
PR head ที่เริ่มตรวจ: `25c286a0716c280f70f950e280371a9c0b3f98e8`
ฐาน main: `9f51896549e809924b448a3c28f8f56fdac34404`

**ข้อสรุป: NOT READY FOR DEPLOY**

โค้ดและการทดสอบจำลองผ่าน แต่สิทธิ์ไฟล์จริง การตั้งค่า OAuth ใน Console
และผล GitHub Actions บน commit ที่ส่งยังไม่ได้ยืนยัน ห้าม Merge/Deploy
จนผู้ดูแลทำรายการตรวจด้วยบัญชีจริงด้านล่างครบและแก้ข้อบกพร่องที่พบ
รายงานนี้ไม่ได้รับรองการตั้งค่า Production จากผลทดสอบจำลอง

## สิ่งที่ตรวจและแก้ไข

ตรวจไฟล์ทั้งหมดที่ PR เพิ่ม/เปลี่ยน: `index.html`, `smt2.js`,
`smt2-config.example.js`, `privacy-policy.html`, และชุดทดสอบ integration
รวมถึง CI และ regression tests ของ main

- ปุ่มผู้ดูแลเปิด SMT2 ในหน้าเดียวกัน พร้อมข้อความเมื่อ config ผิด,
  Google Identity โหลดไม่ได้, popup ถูกปิด, consent ถูกปฏิเสธ และ API ล้มเหลว
- ใช้ Google Identity Services และ Sheets API `values:batchGet` แบบ GET
  ด้วย scope `spreadsheets.readonly`; ไม่มี Apps Script เป็นตัวกลาง
- อ่านชีตทั้ง 8: การะเกด, ชยาน์ขวัญ, ฉัตรพร, ภทรพงค์, สกุลวรรณ,
  ปิยะพงษ์, เทอดพงศ์, โสภา โดยไม่ตัดแถวที่ 1,000 หรือคอลัมน์ Z
- รองรับหัวตารางจังหวัด/จังหวัดที่ตั้ง/province, เรื่อง/ชื่อเรื่อง/subject/title,
  เลขที่หนังสือ/เลขที่รับ/เลขรับ/reference, เจ้าหน้าที่/ผู้รับผิดชอบ/officer
  และสถานะ/สถานะปัจจุบัน/สถานะการดำเนินการ/status พร้อม normalization
  ช่องว่าง, BOM, zero-width และตัวพิมพ์ภาษาอังกฤษ
- แจ้งคอลัมน์ที่ไม่รู้จักหรือขาดหาย แสดงช่องว่างเป็น — ไม่เดาค่าจริง
  และปฏิเสธหัวตารางที่กำกวม การตั้งชื่อเพิ่มเติมต้องอ้างอิง schema จริง
- ค้นหา กรองชีต/สถานะ/จังหวัด สรุปจำนวนตามตัวกรอง แสดงสถานะจริงจากชีต
  และแบ่งหน้าครั้งละ 50 แถว โดยไม่เดาว่าสถานะใดถือว่าเสร็จสิ้น
- ตารางเลื่อนแนวนอนได้บนมือถือ มี label, caption และ live status
- ล้าง token/ข้อมูล/DOM เมื่อ logout, expiry, page exit หรืออ่านข้อมูลล้มเหลว
  ยกเลิกคำขอและกัน callback ที่มาช้าจากการคืนข้อมูลหลัง logout
- Escape ข้อความชีตทั้งในตาราง Dashboard และตัวเลือก ไม่เก็บคอลัมน์ที่ UI ไม่ใช้
- เก็บ token เฉพาะ memory ไม่ลง storage, URL, log หรือไฟล์
- เปลี่ยน Tailwind runtime และ Chart.js ที่ไม่ล็อกเวอร์ชันบน CDN เป็น assets
  ภายในจาก Tailwind 3.4.19 และ Chart.js 4.5.1 พร้อม lockfile และ licenses
  ส่วน Google Identity เป็น script ภายนอกที่ยังจำเป็นต่อ OAuth
- คงเมนูเดิมและ URL CSV ทั้ง 11 แหล่ง ตรวจ hash เทียบ main;
  ไม่แก้ไขข้อมูลจริง ไม่เพิ่มบริการเสียเงิน ไม่ Merge และไม่ Deploy
- แก้ regression test ที่ยังคาดว่าจะมีลิงก์ Apps Script ให้ตรวจ entry OAuth แทน
  โดยยังเก็บการตรวจ navigation และ public summary isolation

## ผลการรันทดสอบจริงในเครื่อง

เครื่อง: Node.js 24.19.0, npm 11.9.0, Python 3.12.14,
Chromium 154.0.8037.57, Playwright 1.56.1

| รายการ | Passed | Failed | ขอบเขตหลักฐาน |
| --- | ---: | ---: | --- |
| `npm test` | 74 | 0 | Regression, parser, readonly API contract, errors, privacy |
| `SMT2_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` | 36 | 0 | 18 กรณี x desktop/mobile, OAuth/API จำลอง |
| `node scripts/check-smt2-public.mjs` | ผ่าน | 0 | ไม่มี approved snapshot เป็น safe empty state |
| `node scripts/smt2-public-preflight.mjs` | ผ่าน | 0 | ไม่มีข้อมูลสรุปที่เผยแพร่ |
| `npm ci` และ build assets | ผ่าน | 0 | ติดตั้งจาก lockfile, ตรวจ asset build ซ้ำ |

รวม automated tests **110 Passed / 0 Failed** ไม่มี skipped/cancelled
ไม่รวมคำสั่งตรวจ snapshot/build ซึ่งไม่มีจำนวน test cases
ผลเริ่มต้นก่อนแก้: Node tests 61 passed / 1 failed;
ผล browser รอบแรก 25 passed / 1 failed เพราะ mock ไม่ได้โหลด Tailwind CSS
ชุดสุดท้ายโหลด CSS และ Chart.js ของแอปจริง และใช้ข้อมูลสังเคราะห์เท่านั้น

Browser tests ครอบคลุม anonymous ไม่มี private request, OAuth popup/denial,
Identity/config ไม่พร้อม, 401/403/404/429/500, network failure ระหว่าง refresh,
response ไม่ครบ, missing headers, XSS payload จำลอง, filter/pagination,
logout ระหว่างโหลด, expiry และเมนู/แท็บเดิม

CI เพิ่ม `npm ci`, build/diff assets และ browser tests บน Node 22
แต่ **ยังไม่ยืนยันผล Actions บน GitHub**: REST/GraphQL ที่ `api.github.com`
ถูก proxy ตอบ Forbidden และ Production URL ก็ถูก proxy ปฏิเสธ
ข้อผิดพลาดนี้ไม่ใช่หลักฐานว่า Actions หรือ Production ล้มเหลว
Git fetch อ่าน branch และ PR refs ได้สำเร็จ

`npm audit` ตรวจพบ **7 รายการ: high 5, moderate 2** ใน build dependencies
ของ Tailwind (braces/chokidar/fast-glob/micromatch และ PostCSS selector chain)
ไม่มี advisory ที่รายงานกับ Chart.js หรือ Playwright ในผลรันนี้
Tailwind 3.4.19 ยังมี dependency chain นี้ และไม่มี patch ของ braces
ที่แก้ advisory ในเวอร์ชันที่ registry มีให้ ณ การตรวจ
ห้ามใช้ `audit fix --force` หรือปิดการตรวจเพื่อทำให้ผลผ่าน
Build รับเฉพาะไฟล์ repository ที่ review แล้ว ไม่รับ pattern/CSS จากผู้ใช้
ความเสี่ยงนี้ยังต้องได้รับการแก้ไขหรือประเมินอย่างเป็นทางการก่อนปิด acceptance;
ผล `audit --omit=dev` เป็นศูนย์ไม่ถือเป็นหลักฐานว่า assets ที่ส่งขึ้นเว็บปลอดภัย

## Security acceptance และข้อจำกัดสิทธิ์ไฟล์

| ประเด็น | สถานะ |
| --- | --- |
| ไม่มี token/client secret ฝังใน production source | ผ่านการตรวจ source |
| ไม่มี write endpoint/POST/PUT/PATCH/DELETE ของ SMT2 | ผ่าน code/API contract |
| Anonymous UI ไม่ส่ง private request | ผ่าน browser จำลอง |
| API ปฏิเสธแล้วไม่เหลือข้อมูลใน DOM | ผ่าน browser จำลอง |
| จำกัดสิทธิ์ API ผู้ไม่มีสิทธิ์จริง | **ยังไม่ตรวจด้วยบัญชีจริง** |
| OAuth client/origin/API enabled/consent policy จริง | **ยังไม่ตรวจใน Console** |
| อ่านข้อมูลและ schema จริงครบ 8 ชีต | **ยังไม่ตรวจด้วยบัญชีจริง** |
| Sharing/Publish to web ของไฟล์จริง | **ยังไม่ตรวจโดยเจ้าของไฟล์** |
| GitHub Actions บน head ล่าสุด | **ยังยืนยันไม่ได้** |
| Dependency audit ของ build tools | **ยังไม่ผ่าน (7 advisories)** |

Client ID และ spreadsheet ID เป็น public identifiers ไม่ใช่ credentials
การตรวจรูปแบบในโค้ดยืนยันไม่ได้ว่า client มีอยู่ใน project ที่ถูกต้อง
ไม่มีสิทธิ์อ่าน Cloud Console หรือ secret bindings ของ Google ในเครื่องนี้
จึงไม่สามารถรับรอง Authorized Origins หรือการเปิด API ได้จาก source

Google เป็นผู้บังคับสิทธิ์ **ระดับไฟล์** Frontend ไม่ใช่ authorization boundary
ไม่มีบทบาท admin ที่เชื่อถือได้จากการซ่อนเมนู ชื่อปุ่ม หรือ client-side allowlist
บัญชีที่มีสิทธิ์ไฟล์อ่านทุกแท็บได้ผ่าน Sheets UI/API รวมทั้งแท็บและคอลัมน์ที่ UI
ไม่ได้แสดง การขอเพียง 8 ranges และ projection ใน JS ไม่จำกัดสิทธิ์ API
Protected ranges/hidden tabs ไม่ป้องกันการอ่าน และ scope readonly ไม่ใช่ scope
เฉพาะไฟล์นี้: ผู้ใช้ต้องเข้าใจว่าความยินยอมครอบคลุมการอ่าน spreadsheets ของบัญชี

**ถ้าไฟล์ถูกแชร์ให้บุคคลที่ไม่ใช่ผู้ดูแล บุคคลนั้นอาจอ่านข้อมูลรายเรื่องผ่าน API ได้**
แม้เว็บไซต์ซ่อนเมนู และจะไม่ผ่านวัตถุประสงค์ความปลอดภัยนี้ ต้องจำกัด sharing
และ groups/domain/link access ให้เฉพาะผู้มีสิทธิ์ หากต้องแยกสิทธิ์รายเจ้าหน้าที่
ให้แยกไฟล์ตามสิทธิ์หรือออกแบบ authorization ฝั่งบริการใหม่; browser-only
architecture นี้ทำสิทธิ์ระดับแท็บไม่ได้ ห้ามเพิ่มบริการเสียเงินเพื่อแก้โดยพลการ

ตรวจ `Publish to web` แยกจาก Drive sharing: published CSV อาจยังเปิดสาธารณะ
แม้ sharing เป็น Restricted ต้องยืนยันว่า private SMT2 ไม่มี published feeds
รวมถึงตรวจว่า CSV เดิมของ LandRight ไม่ชี้ข้อมูล SMT2 ที่เป็นความลับ
เราไม่ได้เปลี่ยน sharing หรือ publish settings ของ Production

ผู้ได้รับสิทธิ์สามารถคัดลอกข้อมูลหรือดู Network ได้ ไม่สามารถป้องกันด้วย UI
การ revoke token ไม่คืนไฟล์/ภาพ/ข้อมูลที่ผู้ใช้คัดลอกไปแล้ว และการถอนสิทธิ์
ขณะหน้าเปิดอยู่อาจยังมีข้อมูลเดิมใน memory จน logout/refresh/expiry
JavaScript ที่รันใน origin เดียวกันเป็น trust boundary; ลด CDN scripts แล้ว
แต่ยังต้อง review source/dependencies และ GIS ก่อนอนุมัติ deployment

## รายการตรวจด้วยบัญชี Google จริง (ผู้ดูแล)

ใช้ test file ที่เป็นข้อมูลสังเคราะห์ก่อน; Production ทำ read-only เท่านั้น
ห้ามส่ง token, Network HAR, screenshots หรือข้อมูลรายเรื่องเข้า GitHub/แชต
บันทึกเฉพาะผลผ่าน/ไม่ผ่าน จำนวนรวม และชื่อคอลัมน์ที่ไม่อ่อนไหว

1. Google Cloud Console: client ต้องเป็น Web application และตรวจ client ID
   ตรงกับ config ตรวจ enabled **Google Sheets API** ใน project เดียวกัน
   Authorized JavaScript Origin ของ Production ต้องเป็น
   **`https://lnwlawyer.github.io`** (ไม่มี `/landright/`)
   หากทดสอบ local ให้เพิ่มเฉพาะ origin จริง เช่น `http://localhost:8000`
   อย่าใช้ wildcard หรือตั้ง origin เป็น path ของหน้าเว็บ
2. ตรวจ consent audience/Internal หรือ External, publishing/testing status,
   test users, readonly scope, domain restrictions และการ verification ที่จำเป็น
   ตรวจ privacy policy ที่ origin ถูกต้อง ไม่ส่ง client secret ไป frontend
3. เจ้าของไฟล์ตรวจ Restricted sharing และสมาชิก/groups/domain/link access
   ให้ไม่มีบุคคลที่ไม่ควรอ่านข้อมูล ตรวจไม่มี SMT2 `Publish to web`
   หากพบ public access หยุดตรวจ Production และให้เจ้าของข้อมูลแก้ไขก่อน
4. บัญชีผู้ดูแลที่อนุญาต: เปิด staging/local origin ที่ได้รับอนุญาต กดปุ่มผู้ดูแล
   ยินยอม OAuth ตรวจว่าอ่านครบ 8 tabs และเทียบจำนวนที่ไม่ว่าง/หัวตารางจริง
   โดยไม่แก้ไขแถวใด ทดลองค้นหา กรอง และตรวจ Dashboard รวมตรงกับแถวที่แสดง
5. Incognito แบบไม่ login: ต้องไม่ส่ง private Sheets requests และไม่มี record
   จากนั้นเรียก Sheets API ของไฟล์โดยไม่มี Authorization โดยไม่บันทึก body;
   ต้องไม่มีข้อมูลรายเรื่อง (การตอบ 401/403/404 ที่ไม่มีข้อมูลถือเป็น denial)
6. บัญชี Google ที่ไม่มีสิทธิ์ไฟล์: ทดลอง OAuth ผ่านเว็บและ GET API โดยตรง
   ต้องถูกปฏิเสธทั้งคู่ แม้แก้ DOM ให้เมนูแสดงเอง ต้องไม่มีข้อมูลรายเรื่อง
7. บัญชีที่ได้รับไฟล์แต่ไม่ใช่ผู้ดูแลต้องถือเป็น **sharing policy failure**
   ถ้าอ่าน API ได้ ห้ามสรุปว่า frontend ป้องกันสำเร็จ และห้ามเพิ่มการแชร์
   Production เพื่อทดสอบ ใช้ synthetic file สำหรับพิสูจน์ข้อจำกัดนี้
8. ปิด popup, ปฏิเสธ consent, ใช้บัญชีผิด, offline, refresh หลังถอนสิทธิ์ใน
   synthetic file, logout และกลับด้วย Back/Forward: ข้อผิดพลาดต้องชัดเจน
   และหลัง logout/expiry ต้องไม่เหลือข้อมูลใน DOM/storage
9. ตรวจ desktop/mobile ด้วย styles/fonts จริง ทั้งเมนูเดิมและ SMT2
   ตรวจการอ่านข้อมูลเดิมและแผนภูมิ ไม่มี snapshot หรือ private data export
10. ดู Actions ของ PR #43 ที่ head ล่าสุด ต้องผ่าน Node และ browser suites
    บันทึกผลที่ผูกกับ SHA จริง ปิดประเด็น build dependency advisories
    แล้วให้เจ้าของข้อมูลลงผล acceptance ของ sharing/OAuth ก่อนพิจารณา Merge

ไม่เปิด production deployment เพื่อพิสูจน์ว่า OAuth works ก่อน acceptance
ผู้ดูแลต้องใช้ local/staging origin ที่เหมาะสมและไม่เผยแพร่ข้อมูลจริง
