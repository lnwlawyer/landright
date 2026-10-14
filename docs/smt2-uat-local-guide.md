# เปิด UAT ที่แยกจาก Production — 14 ตุลาคม 2569

ใช้ server บนเครื่องผู้ดูแลเท่านั้น ไม่มี URL สาธารณะ ไม่มี public tunnel
ไม่มีค่าใช้จ่ายหรือ Apps Script และไม่เปลี่ยน Google Sheets permissions/data

รับทราบการยืนยันของผู้ดูแลว่า Restricted sharing และ OAuth Client/Origins/API/
Test users ถูกต้องแล้ว บันทึกเป็น **ผู้ดูแลยืนยัน** ไม่ใช่ผล Codex ทดสอบ Google จริง
UAT login/denial/read-data บัญชีจริงยังต้องรันตามคู่มือนี้

## เปิดใช้ได้ทันที: Synthetic UAT

ต้องมี Git และ Python 3; ใช้ assets ที่ Commit แล้ว ไม่ต้องติดตั้ง npm เพื่อเปิดหน้า
ใช้ checkout ใหม่บนเครื่องผู้ดูแลเพื่อไม่ปนกับงานอื่น:

```bash
git clone --branch feature/smt2-private-sheets-oauth https://github.com/lnwlawyer/landright.git landright-uat
cd landright-uat
git rev-parse HEAD
python3 scripts/serve-smt2-uat.py --mode synthetic --port 8000
```

Windows ใช้ `py -3` แทน `python3` ได้ หาก port ถูกใช้ ให้หยุดเฉพาะ server ของตนเอง
หรือเลือก port อื่นด้วย `--port`; live OAuth ต้องตรง port ของ registered origin

ใน browser **ของเครื่องที่รันคำสั่ง** พิมพ์ address ต่อไปนี้เอง:

```text
http://localhost:8000/index.html?view=smt2
```

นี่เป็น local address ไม่ใช่ URL ของ cloud ที่เปิดจากเครื่องอื่นได้
ไม่มีการจัดทำ preview link สาธารณะจากเครื่อง Codex
หยุด server ด้วย Ctrl+C; ไม่มี record/token ที่เขียนลง disk โดย launcher

หน้าแสดง banner “ข้อมูลจำลอง — ไม่ใช่ Google OAuth จริง” ปุ่ม Google ในโหมดนี้
เป็น fake identity เพื่อทดสอบ UI เท่านั้น ไม่ได้เปิด Google popup หรือ login จริง
ก่อนกดต้องไม่มีข้อมูล หลังเข้าสู่ simulation มี 488 records (61 ต่อชีต),
เลือกการะเกด+เสร็จแล้วได้ 30 records ทดลองค้นหา ตัวกรอง Dashboard และ Logout

จำลองบัญชีไม่มีสิทธิ์ด้วย address:

```text
http://localhost:8000/index.html?view=smt2&uat-role=denied
```

กด entry แล้วต้องแสดง denial ไม่มีข้อมูล การผ่าน simulation ไม่ใช่ UAT บัญชีจริง
Synthetic mode ถูก CSP จำกัด connect-src เฉพาะ self และไม่โหลด GIS/fonts/icons
ภายนอก CSV เดิมถูกแทนด้วย empty synthetic response ไม่มีการอ่านแหล่ง Production

## Live Google OAuth: prerequisite ที่ผู้ดูแลต้องตรวจ

1. สำหรับทดสอบด้วยข้อมูลจำลอง ใช้ **ไฟล์ UAT แยกที่มีอยู่แล้ว** ซึ่ง Restricted และมีเฉพาะข้อมูลจำลอง
   มีทั้ง 8 tabs ตาม Checklist ไม่ใส่ข้อมูลรายเรื่อง Production และไม่เปลี่ยน sharing
   Launcher ปฏิเสธ ID ของ Production ใน repository โดยตรง
2. การที่ ID ต่างจาก Production ไม่พิสูจน์ว่าไม่มี PII: ผู้ดูแลต้องยืนยันเนื้อหาไฟล์ UAT
   หากยังไม่มีไฟล์ที่เข้าเงื่อนไข ใช้ synthetic mode หรือเลือกอ่านแหล่ง Restricted
   ที่ผู้ดูแลยืนยันแล้วตามวิธี read-only ด้านล่าง ไม่สร้างไฟล์/แก้ sharing โดย Codex
3. ตรวจว่า client ที่ได้รับการยืนยันมี origin **`http://localhost:8000`** อยู่แล้ว
   Origin Production `https://lnwlawyer.github.io` อย่างเดียวไม่ครอบคลุม localhost
   ถ้า origin ไม่ตรง ให้หยุด live UAT; Codex ไม่เปลี่ยน Console settings หรือขยาย origins
   สามารถเลือก public client ID ของ UAT client ที่ลงทะเบียนไว้อยู่แล้วได้
4. บัญชี A มีสิทธิ์ไฟล์ UAT; บัญชี B ใช้ OAuth client ได้แต่ไม่มีสิทธิ์ไฟล์ UAT
   ไม่เพิ่ม file sharing/permissions ระหว่างการทดสอบนี้

หยุด synthetic server ก่อน แล้วรัน โดยแทน placeholder ด้วย public UAT file ID:

```bash
python3 scripts/serve-smt2-uat.py --mode live --port 8000 --spreadsheet-id UAT_SPREADSHEET_ID
```

หากใช้ UAT OAuth client ที่มีอยู่แล้ว:

```bash
python3 scripts/serve-smt2-uat.py --mode live --port 8000 --spreadsheet-id UAT_SPREADSHEET_ID --oauth-client-id PUBLIC_UAT_CLIENT_ID
```

ไม่ส่ง access token/client secret ผ่าน CLI/config; ID ทั้งสองเป็น public identifiers
config เปลี่ยนเฉพาะ HTTP response ใน memory ไม่แก้ `smt2-config.example.js`
server ส่งเฉพาะ allowlisted application files ไม่ส่ง directory/.git/docs/cache
ไม่รับ POST ไม่ส่ง Google request แทน browser และไม่เก็บ request/query logs
ตัว server รับ connection เฉพาะ 127.0.0.1 และตรวจ Host เพื่อกัน DNS rebinding

Live banner บอก “OAuth จริง — ใช้ไฟล์ UAT แยกเท่านั้น” server ไม่ได้อ่านไฟล์ Google
browser ติดต่อ GIS และ Sheets API โดยตรงด้วย token readonly ใน memory
CSV เดิมไม่โหลด Production ในสภาพแวดล้อม UAT นี้; fonts/icons ภายนอกถูกปิด
เพื่อแยก UAT traffic ออก หน้าตาจึงอาจใช้ font fallback ต่างจากเว็บไซต์จริง

## Authorized / Unauthorized / Anonymous

- A: เปิด SMT2 กดผู้ดูแล เลือกบัญชี A ใน Google popup ยินยอม readonly
  ต้องเปิดครบ 8 tabs และเทียบยอด/schema กับไฟล์ UAT; ตรวจ warning ก่อนให้ผ่าน
- B: ใช้ browser profile/incognito แยกจาก A ยินยอม OAuth ด้วย B ที่ client ยอมรับ
  ต้องไม่มี rows และ API ปฏิเสธ ถ้าล้มที่ consent/test users ก่อน API ให้บันทึก B
  ไม่ถือว่าเป็นหลักฐาน Sheets ACL; อย่าแก้ด้วยการแชร์ไฟล์ให้ B
- Anonymous: fresh incognito ไม่กด login ต้องไม่มี private Sheets requests หรือ records
- API โดยตรง: ทดสอบด้วย valid token ของ B อย่างส่วนตัว ตาม
  [คู่มือบัญชีจริง](smt2-google-account-testing.md) บันทึกเฉพาะ status/pass-fail
  ไม่บันทึก token/response body/HAR; anonymous 401 อย่างเดียวไม่ยืนยัน file ACL
- Logout: ต้องล้าง data/DOM และ storage ไม่มี token ตรวจ reload/Back/Forward/expiry
  แยกจาก Google account cookies ซึ่งอาจยัง login ใน Google อยู่ตามปกติ

ใช้ [UAT Checklist](smt2-uat-checklist.md) ซึ่งมีช่องบันทึกผลและตารางทั้ง 8 ชีต
เก็บสำเนาที่กรอกนอก checkout/ช่องทางสาธารณะ ไม่แนบภาพหรือ rows จริงใน PR

### อ่านต้นฉบับที่ผู้ดูแลยืนยัน โดยไม่ Deploy/แก้ข้อมูล

สำหรับตรวจความครบถ้วนของ 8 ชีตต้นฉบับ สามารถเปิด **เฉพาะบนเครื่องผู้ดูแล**:

```bash
python3 scripts/serve-smt2-uat.py --mode live --use-approved-source --port 8000
```

คำสั่งนี้เลือก ID เดิมที่ผู้ดูแลยืนยัน Restricted แล้วอย่างชัดเจน ไม่เปลี่ยนไฟล์
permissions หรือข้อมูลใน Sheets ใช้ OAuth scope readonly และ GET ผ่าน browser
server ไม่รับ token/rows ไม่ proxy Google ไม่ cache/log ข้อมูล และไม่มี URL สาธารณะ
การแยกจาก Production คือแยก website/runtime; แหล่งข้อมูลในตัวเลือกนี้ยังเป็นต้นฉบับ
จึงใช้ trusted managed device/account เท่านั้น และห้ามเผยภาพ/rows/token/HAR
ค่าเริ่มต้น launcher ยังเป็น synthetic ไม่อ่านต้นฉบับอัตโนมัติ

หากเลือกตัวเลือกนี้ ให้บันทึก Checklist ว่า “อ่านต้นฉบับที่ยืนยันแบบ read-only”
และเก็บยอด/ผลไว้ภายในเท่านั้น ไม่ทำกรณีถอนสิทธิ์/เพิ่ม sharing/สร้าง test rows
ใช้ synthetic mode สำหรับจำลองข้อมูลผิดรูปแบบและกรณีที่ต้องเปลี่ยนข้อมูล
บัญชี A/B/anonymous และ origin ต้องเข้าเงื่อนไขเดิม ถ้า prerequisite ขาดให้ B
การเปิดเว็บไซต์บน localhost ไม่ทำให้ scope เปลี่ยนเป็นสิทธิ์แก้ไขข้อมูล

## Desktop และ Mobile

Desktop เปิดบนเครื่องเดียวกับ server; ใช้ browser responsive mode ทดสอบ
viewport/overlay/filter/table scrolling ได้ การจำลองขนาดจอไม่พิสูจน์ mobile OAuth

สำหรับ **Android ที่ผู้ดูแลมี Termux จากแหล่งทางการอยู่แล้ว** สามารถใช้ Git/Python
ใน Termux (`pkg install git python`) clone branch และรันคำสั่งเดียวกันบนโทรศัพท์
เปิด localhost ใน browser ของโทรศัพท์ ต้องเป็น origin ที่ลงทะเบียนไว้เช่นกัน
ไม่มีการเปิด LAN binding หรือ public URL; ปิด Termux server หลังทดสอบ
การติดตั้งเครื่องมือบนอุปกรณ์ผู้ดูแลเป็นงานของผู้ดูแล ไม่ได้ดำเนินการโดย Codex

หาก iOS/อุปกรณ์อื่นไม่มีวิธีรัน loopback server ที่เหมาะสม ให้บันทึก physical-mobile
cases เป็น N/B ใช้ responsive mode สำหรับ layout และอย่าอ้างว่า Google login
บนมือถือจริงผ่าน ไม่เปลี่ยน server เป็น 0.0.0.0 ไม่เปิด tunnel เพื่อแก้ข้อจำกัดนี้

## ข้อจำกัดและ exit criteria

- รับทราบ sign-off ของ settings แล้ว แต่ไม่เคยทดสอบ Google บัญชีจริงแทนผู้ดูแล
- ไม่ได้ยืนยันเนื้อหา/ACL/origin ของ UAT file/client ใหม่จาก source เพียงอย่างเดียว
- Google เป็น file-level ACL ผู้มีสิทธิ์ไฟล์อ่านทุกแท็บได้; UI ไม่บังคับสิทธิ์ระดับแท็บ
- Mobile emulation/automated synthetic tests ไม่แทน physical-device OAuth
- Code/automated tests พร้อมสำหรับ UAT; **deployment acceptance ยังไม่ครบ**
  จนผู้ดูแลกรอกผลบัญชีจริง/data ทั้ง 8 ชีตและอุปกรณ์ที่จำเป็นครบ
- ไม่มี Merge, Production deployment, permission changes, data writes หรือค่าบริการเพิ่ม
