# คู่มือตรวจ Google OAuth และสิทธิ์ไฟล์ SMT2 ด้วยบัญชีจริง

วันที่: 13 ตุลาคม 2569 — PR #43, `feature/smt2-private-sheets-oauth`
สถานะก่อนดำเนินการ: **NOT READY FOR DEPLOY**

## สิ่งที่ Codex ตรวจอัตโนมัติได้

ตรวจ source/config syntax, dependency audit, API แบบ GET/read-only,
การอ่าน 8 ranges, alias ของหัวตาราง, search/filter/dashboard,
การไม่เรียก private API ก่อน OAuth, token/DOM cleanup, errors,
CSV เดิม 11 feeds และ visual/functional regression ด้วยข้อมูลสังเคราะห์
ผลทดสอบเหล่านี้ไม่ยืนยัน Google Console, รายชื่อผู้มีสิทธิ์ หรือข้อมูลจริง

## สิ่งที่เจ้าของ Google Project/ไฟล์ต้องตรวจเอง

ไม่มีบัญชี Google, browser session ของผู้ดูแล หรือสิทธิ์ Cloud Console
เชื่อมต่อให้ Codex ในงานนี้ ไม่ต้องส่ง secret/token/บัญชี/ข้อมูลรายเรื่องเข้าแชต
เก็บหลักฐานที่มีอีเมลหรือข้อมูลจริงในช่องทางภายในของหน่วยงานเท่านั้น

### 1. เตรียมที่ทดสอบโดยไม่ Deploy

ใช้ checkout ของ PR ที่ SHA ระบุในรายงานล่าสุด รัน `npm ci`,
`npm run build:assets` และ `python3 -m http.server 8000 --bind 127.0.0.1`
บนเครื่องผู้ดูแล เปิดผ่าน local origin ที่ลงทะเบียนไว้ใน Console
ไม่ Merge และไม่ Deploy PR เพียงเพื่อทดสอบ OAuth

เริ่มด้วยไฟล์ synthetic ที่มีทั้ง 8 tabs และ schema ที่เป็นตัวแทนของจริง
ตั้ง spreadsheet ID เป็นไฟล์ทดสอบในสำเนา checkout ของผู้ดูแลเท่านั้น
ห้าม commit ค่า local override/ผลข้อมูลจริง ห้ามสร้าง test rows ใน Production
การตรวจ Production ภายหลังต้องอ่านอย่างเดียวและได้รับสิทธิ์จากเจ้าของไฟล์

### 2. Google Cloud Console — เจ้าของ Project

- OAuth client ต้องเป็น **Web application** ใน project ที่เปิด Google Sheets API
  ตรวจ client ID ตรงกับ `smt2-config.example.js` ที่โหลดจริง
  Client ID เป็นข้อมูลสาธารณะ ไม่ใช่ client secret
- Authorized JavaScript Origin ของ Production คือ
  **`https://lnwlawyer.github.io`** ไม่มี `/landright/` หรือ path อื่น
  local เพิ่มเฉพาะ origin ที่ใช้จริง เช่น **`http://localhost:8000`**
  `localhost` กับ `127.0.0.1` เป็นคนละ origin ต้องใช้ให้ตรงกับที่ลงทะเบียน
- Token flow ผ่าน GIS ไม่ต้องฝัง client secret หรือใช้ Apps Script
  ตรวจ consent audience (Internal/External), Testing/Production,
  test users, domain restrictions และข้อกำหนด verification ของ Google
- ตรวจ scope `https://www.googleapis.com/auth/spreadsheets.readonly`
  และ privacy policy ที่ถูกต้อง ผู้ใช้ต้องเข้าใจว่า scope ไม่จำกัดเฉพาะไฟล์นี้
- หากพบ `origin_mismatch`, `access_denied`, API disabled หรือ consent app
  ไม่อนุญาตผู้ทดสอบ ให้แก้ใน Console โดยเจ้าของ project แล้วทดสอบใหม่
  อย่าแก้ด้วย scope เขียน, public sharing หรือการฝัง token

### 3. Drive Sharing/Publish — เจ้าของข้อมูล

- General access ต้องเป็น **Restricted** และสมาชิก/group/domain/link access
  ต้องตรงรายชื่อผู้ที่ได้รับอนุญาตอ่านข้อมูลทุกแท็บจริง
- ตรวจสมาชิกกลุ่มและ external users รวมถึงสิทธิ์ที่สืบทอดจากโฟลเดอร์/Shared Drive
- ตรวจ **Publish to web** แยกจาก sharing: private SMT2 ต้องไม่เผยแพร่ CSV,
  tabs หรือช่วงข้อมูลรายเรื่อง อย่าถือว่า Restricted ยกเลิก published feed แล้ว
- ตรวจว่า 11 published CSV feeds เดิมของ LandRight เป็นข้อมูลที่อนุญาตให้เผยแพร่
  และไม่มีข้อมูล SMT2 ที่ต้องจำกัดสิทธิ์ ไม่เปลี่ยน URL หรือข้อมูลเดิมเพื่อให้ test ผ่าน
- Hidden tabs/protected ranges ไม่ป้องกันการอ่าน คนมีสิทธิ์ไฟล์สามารถอ่านทุกแท็บ
  ถ้าพบบุคคลที่ไม่ควรมีสิทธิ์หรือ public access ให้หยุดและให้เจ้าของข้อมูลแก้ไข
  Codex ไม่ได้เปลี่ยน sharing/Publish settings ในงานนี้

### 4. บัญชีทดสอบและเกณฑ์ผล

| บัญชี/กรณี | ผ่านเมื่อ |
| --- | --- |
| Incognito ไม่ login | ไม่มี private Sheets request และไม่มี record ใน DOM |
| บัญชีที่มีสิทธิ์และอนุญาต OAuth | อ่านครบทั้ง 8 ชีต จำนวน/หัวตารางตรงต้นฉบับ |
| บัญชี Google ที่ไม่มีสิทธิ์ไฟล์ | OAuth อาจผ่าน แต่ API ต้องไม่ส่งข้อมูลรายเรื่อง |
| ผู้มีสิทธิ์ไฟล์แต่ไม่ใช่ผู้ดูแล | ถือเป็น sharing-policy failure ถ้าอยู่นอกผู้มีสิทธิ์ที่ตกลงไว้ |
| ปิด popup/ไม่ยินยอม/Identity โหลดไม่ได้ | SMT2 เปิดอยู่และแสดงเหตุผล ไม่เริ่ม private read |
| Logout/expiry/page exit | ล้าง DOM/records/token และ response ที่มาช้าไม่คืนข้อมูล |
| Refresh หลังถอนสิทธิ์จาก synthetic file | ไม่เหลือข้อมูลเก่าเมื่อ API ปฏิเสธ |

ทดสอบบัญชีที่ได้รับไฟล์แต่ไม่ใช่ผู้ดูแลบน **synthetic file** เท่านั้น
ห้ามเพิ่ม sharing ของ Production เพื่อสร้างสถานการณ์ทดสอบ
ตรวจ unauthorized API ด้วย token ของบัญชีที่ไม่มีสิทธิ์ไฟล์จริง ไม่ใช้ token ผู้ดูแล
อย่าใช้ผล 403 จาก API-disabled หรือ OAuth policy เป็นหลักฐานของ file ACL
ต้องมี authorized control ที่อ่านไฟล์เดียวกันได้ด้วย API/client เดียวกัน

### 5. ตรวจ API โดยตรงอย่างปลอดภัย

ผู้ดูแลสามารถใช้ Google Identity token flow ใน local page เดียวกันกับแอป
และยิง GET ไป `sheets.googleapis.com/v4/spreadsheets/<ID>/values:batchGet`
ด้วย Authorization ของบัญชีทดสอบ ขอบเขต readonly เท่านั้น
บันทึกเฉพาะ status code และ pass/fail ไม่บันทึก token, response body หรือ HAR
ไม่ใส่ token ใน URL, ไฟล์, shell history หรือ issue ของ GitHub

Anonymous request ที่ได้ 401 แสดงเพียงว่าคำขอนั้นไม่มี authentication
**ไม่พิสูจน์ว่า sharing/published CSV ถูกปิด** ต้องตรวจ owner settings และ
API ด้วยบัญชีที่ไม่มีสิทธิ์และ token ที่ถูกต้องประกอบกัน
บัญชีไม่มีสิทธิ์ต้องไม่ได้ข้อมูล แม้แก้ DOM ให้เมนูแสดงหรือยิง API เอง
หาก API ส่ง 200 ให้หยุด ไม่อ่าน/เผยแพร่ body และตรวจ file sharing ก่อน

### 6. ตรวจ functional ด้วยบัญชีที่มีสิทธิ์

- ตรวจชื่อชีตทั้ง 8 ตาม `smt2/sheets-reader.mjs` รวมชื่อสะกดและ row 1 headers
  ไม่ถือว่าทดสอบผ่านเพียงเพราะ API ส่ง 200
- เทียบจำนวนแถวไม่ว่างทุกชีต รวมแถวเกิน 1,000; ชีตว่างต้องไม่สร้าง record
- ถ้ามีคำเตือน missing headers ให้ตรวจ schema จริงและแก้ alias บน branch
  ไม่เดาค่า ไม่เผยแพร่ตัวอย่างแถวจริง และไม่เปลี่ยนหัวตาราง Production
- ทดสอบค้นหา combined filters (ชีต/สถานะ/จังหวัด), pagination, refresh
  และยอด Dashboard ที่ตรงกับจำนวนหลังกรอง รวมสถานะที่ไม่ระบุ
- ทดสอบ popup blocked, wrong account, consent denial, offline,
  logout ขณะโหลด, expiry, reload และ Back/Forward ด้วย synthetic file ก่อน
- ตรวจทุกเมนู/แท็บเดิม ตาราง แผนภูมิ และ navigation overlay บนคอมพิวเตอร์
  และมือถือจริง รวม browser ที่หน่วยงานใช้ Tailwind 4 รองรับ modern browsers;
  หากต้องใช้ Safari ก่อน 16.4, Chrome ก่อน 111 หรือ Firefox ก่อน 128
  ให้หยุดรับรอง compatibility และประเมินเพิ่มเติมก่อน deployment

### 7. บันทึก acceptance โดยไม่เผยข้อมูลส่วนตัว

บันทึก SHA, browser/version, role ของบัญชี (ไม่ใส่อีเมล), expected/actual status,
pass/fail และจำนวนรวมที่ได้รับอนุญาตให้บันทึก ห้ามแนบ token/HAR/ภาพตารางจริง

ทุกข้อข้างต้นต้องผ่านและ Actions ของ SHA ล่าสุดต้อง Success จึงพิจารณา
READY FOR DEPLOY ได้ การอนุมัติ deployment เป็นงานแยกจาก PR นี้
โค้ด client ไม่สามารถสร้างสิทธิ์ระดับแท็บหรือบทบาท admin ที่เหนือ file ACL ได้
