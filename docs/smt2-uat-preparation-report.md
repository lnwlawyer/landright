# ผลเตรียม UAT LandRight–SMT2 — 14 ตุลาคม 2569

Branch `feature/smt2-private-sheets-oauth` / [PR #43](https://github.com/lnwlawyer/landright/pull/43)

## สถานะก่อนเริ่มและ sign-off

ก่อนเริ่ม local/remote/PR HEAD ตรงกันที่
`86a3e0555c957cbd83dade3c8b513a099e36cc75` และ Git สะอาด
[Actions run 38420848384](https://github.com/lnwlawyer/landright/actions/runs/38420848384)
เป็น **Success**, Browser 68 passed

รับทราบคำยืนยันผู้ดูแลวันที่ 14 ตุลาคม 2569:
Restricted sharing/สิทธิ์เข้าถึง และ OAuth Client/Authorized Origins/Sheets API/
Test users ถูกต้องแล้ว เป็น **ผู้ดูแลยืนยัน** ไม่ใช่ Codex เข้า Console ตรวจเอง

## สภาพแวดล้อมที่จัดเตรียม

`python3 scripts/serve-smt2-uat.py` เป็น server localhost ของเครื่องผู้ดูแล
ไม่มี public preview URL หรือต้นทุนบริการ บังคับ bind 127.0.0.1, ตรวจ Host,
ไม่เปิด directory listing/.git/docs, ปฏิเสธ POST, no-store/no-referrer,
CSP และ CORP same-origin ไม่รับ token หรือ proxy Google API
ไม่มี access/query logs หรือระบบเขียน record ลงไฟล์

- **Synthetic (ค่าเริ่มต้น):** fake identity/488 fake records จาก 8 ชีต
  ไม่โหลด Google GIS ไม่ส่ง request ภายนอกหรืออ่าน legacy Production CSV
  label บอกชัดว่าไม่ใช่ OAuth จริง มี query จำลอง denied account
- **Live + UAT file:** เลือกไฟล์ Restricted ข้อมูลจำลองที่มีอยู่แล้วชัดเจนด้วย
  `--spreadsheet-id` ไม่มีการสร้างไฟล์หรือเปลี่ยน sharing
- **Live + approved source:** เลือก `--use-approved-source` เพื่ออ่านต้นฉบับที่
  ผู้ดูแลยืนยัน Restricted แล้วบน browser ของผู้ดูแล ผ่าน OAuth readonly/GET
  แยก website/runtime จาก Production แต่ยังอ่านแหล่งต้นฉบับตามตัวเลือกนี้
  ไม่แก้ permissions/data และไม่เผยแพร่ rows เป็น endpoint ของ local server

การเปลี่ยน config/เพิ่ม banner/แยก CSV ทำเฉพาะ HTTP response ใน memory
`index.html`, `smt2-config.example.js`, production application logic และ source data
ไม่เปลี่ยนจากการเปิด launcher ไม่ใช้ Apps Script หรือเพิ่มบริการเสียเงิน

## ผลที่รันจริง

| ตรวจ | ผล |
| --- | --- |
| `npm test` | **78 Passed / 0 Failed**, no skipped/cancelled |
| Browser suite | **74 Passed / 0 Failed**, desktop 1280×800 / mobile viewport 390×844 |
| รวม automated cases | **152 Passed / 0 Failed** |
| Full `npm audit` | **0 findings** รวม dev dependencies |
| Build/rebuild asset diff | ผ่าน |
| Public snapshot gate/release preflight | ผ่าน; ไม่มี approved snapshot |
| UAT synthetic browser requests | **0 external requests** ใน allowed flow |
| UAT allowlisted assets/no-store/.git/docs/Host/POST | ผ่าน |
| Live UAT HTTP config/CSP และ approved-source banner | ผ่านการตรวจ HTTP ในเครื่องด้วย dummy config/GET เท่านั้น |
| Config ใน repository หลังตรวจ live routing | ไม่เปลี่ยน |
| Google OAuth popup/บัญชีจริง/API rights จริง | **ยังไม่รัน** |
| Desktop browser บัญชีจริง / มือถือจริง | **ยังไม่รัน** |

Synthetic preview ใหม่มี 6 browser cases รวม 2 viewports, ครอบคลุมก่อน login,
488 records/filter/logout, simulated denial และ local-server exposure controls
CLI tests ป้องกัน accidental source selection, invalid args และ mixed source options
ส่วน unit/security/regression เดิมยังรันครบ ไม่ใช่การแทนด้วย smoke tests เพียงอย่างเดียว

ระหว่างเตรียม full browser suite พบ comparison ล้มเหลวจาก hover ของ cursor
ที่ worker ใช้ซ้ำ จัดทั้ง reference/current page ให้เป็น foreground, จอดเมาส์นอก
viewport และรอ animation frames ก่อนจับ metrics/ภาพ โดยไม่เปลี่ยน baseline,
geometry/color assertions, raster-noise rule หรือเพิ่ม retries ผลสุดท้ายผ่านครบ

HTTP validation ของ live mode ไม่ได้โหลด GIS, ขอ token หรืออ่าน Google Sheets
จึงไม่ถือว่า Google บัญชีจริงผ่าน และไม่มีการใช้ข้อมูลจริงใน automated tests

## วิธีเปิดให้ผู้ดูแลเริ่มได้ทันที

ดู [คู่มือเปิด local UAT](smt2-uat-local-guide.md) และ
[Checklist มีช่อง P/F/N/B](smt2-uat-checklist.md)

clone branch ลงเครื่องผู้ดูแล แล้วรัน:

```bash
python3 scripts/serve-smt2-uat.py --mode synthetic --port 8000
```

พิมพ์ address ต่อไปนี้ใน browser ของ **เครื่องที่รัน server**:

```text
http://localhost:8000/index.html?view=smt2
```

ไม่ใช่ URL ของ cloud ที่เปิดจากเครื่องอื่นได้ ไม่มี public URL ที่เผยข้อมูลจริง

เมื่อตรวจ origin/บัญชี A/B พร้อมแล้ว หยุด simulation และเลือก live mode
บนเครื่องผู้ดูแล:

```bash
python3 scripts/serve-smt2-uat.py --mode live --use-approved-source --port 8000
```

หรือใช้ `--spreadsheet-id UAT_SPREADSHEET_ID` สำหรับ existing synthetic UAT file
Origin ต้องตรง registered origin ของ client เช่น localhost:8000;
การ sign-off ของ Production origin ไม่ได้พิสูจน์ว่า local origin มีอยู่ด้วย
ถ้าไม่มี prerequisite ให้บันทึก B ไม่ขยาย permissions/origins ด้วย Codex

## สิ่งที่ผู้ดูแลต้องทำ

บัญชี A/บัญชี B ที่มี OAuth ได้แต่ไม่มี file permission/anonymous,
เทียบจำนวนและ header mapping ของ 8 ชีต, search/combined filters/dashboard,
pagination/refresh/logout/reload/expiry/late response และ Desktop/Mobile
ตาม Checklist เก็บผลที่กรอกและข้อมูลต้นฉบับไว้ภายในเท่านั้น ไม่แนบ token/HAR/
ภาพหรือ case rows ใน PR

Physical mobile ทำได้เมื่อรัน loopback บนอุปกรณ์เอง เช่น Android ที่มี Termux
จากแหล่งทางการและ Python/Git; ไม่มี LAN binding/public tunnel
Responsive mode เป็นหลักฐาน layout เท่านั้น ไม่แทน actual mobile OAuth
หากอุปกรณ์ทำไม่ได้ให้ N/B แทนการอ้างผ่าน

**พร้อมเริ่ม UAT ที่เครื่องผู้ดูแล; ยังไม่รับรองว่า UAT บัญชีจริงผ่าน**
สถานะ deployment ยัง **NOT READY FOR DEPLOY** จนผลบัญชีจริง/data/device ที่จำเป็นครบ
ไม่มี Merge, Production deploy, permission changes หรือการแก้ข้อมูลจริงในงานนี้
