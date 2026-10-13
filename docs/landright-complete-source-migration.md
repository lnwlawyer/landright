# LandRight + SMT2: แผนย้ายแหล่งข้อมูลไปยัง “ส่วนกำหนดสิทธิ (สมบูรณ์)”

**สถานะ: ตรวจสอบโครงสร้างต้นฉบับแล้ว / ยังไม่สลับข้อมูล Production / ยังไม่ Deploy Apps Script**

## แหล่งข้อมูลใหม่

Google Sheets ID: `1QR9jddn5EjfOyMRVGkwz31eppY_L9vZAnqO6I9mNLgc` (ยืนยันด้วย Google Drive connector 13 ต.ค. 2569)

| เมนู LandRight | ชีตต้นฉบับ | การเข้าถึงที่ต้องตรวจรับ |
|---|---|---|
| มาตรา 93 | มาตรา 93 | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| มาตรา 96 ทวิ | มาตรา 96 ทวิ | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| BOI | BOI | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| เช่าเพื่อพาณิชยกรรม | เช่าเพื่อพาณิชยกรรม | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| วัด | วัด | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| มัสยิด | มัสยิด | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| มูลนิธิคริสต์ | มูลนิธิคริสต์ | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| วัดคาทอลิก | วัดคาทอลิก | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| ที่ดินทอดทิ้ง | ที่ดินทอดทิ้ง | เฉพาะข้อมูลที่อนุมัติให้เผยแพร่ |
| ตรวจสอบหลักทรัพย์ | ตรวจสอบหลักทรัพย์ | ต้องประเมินข้อมูลส่วนบุคคลก่อนเผยแพร่ |
| ค้นหาเอกสาร | ค้นหาเอกสาร | ต้องประเมินข้อมูลส่วนบุคคลก่อนเผยแพร่ |
| SMT2 | การะเกด, ชยาน์ขวัญ, ฉัตรพร, ภทรพงค์, สกุลวรรณ, ปิยะพงษ์, เทอดพงศ์, โสภา | เจ้าหน้าที่ที่ผ่านการยืนยันตัวตนเท่านั้น |

มี Config และ OrgChart ในไฟล์เดียวกัน: **ห้ามนำเข้ารายการชีตสาธารณะโดยอัตโนมัติ**

## ผลตรวจหัวตาราง (แถว 1 เท่านั้น)

- มาตรา 93, มาตรา 96 ทวิ, เช่าเพื่อพาณิชยกรรม: `id, name, nationality, province, plot_count, เนื้อที่ตารางวา, note, land_use_type, area_rai, area` (เช่าเพื่อพาณิชยกรรมมีฟิลด์เพิ่ม)
- BOI: `id, year, name, จังหวัด, เนื้อที่(ไร่), plot_count, ... , เนื้อที่ตารางวา, note, area_rai, area` — **ต้อง map จังหวัด -> province และตรวจรูปแบบเนื้อที่**
- ศาสนา: `area_rai, area` และตารางสรุปเพิ่มเติมในชีตเดียวกัน; อ่านเฉพาะช่วงคอลัมน์รายการที่ผ่านการอนุมัติ
- ที่ดินทอดทิ้ง: `id, plot_id, plot_count, province, area_rai, status`
- ตรวจสอบหลักทรัพย์: `id, case_id, person_name, client_name, date`
- ค้นหาเอกสาร: `id, request_id, person_name, copy_count, document_count, date`
- SMT2 เจ้าหน้าที่: `ลำดับ, จังหวัด, เรื่อง, หมายเลขเอกสารสิทธิ ผู้ขอ/ผู้ร้อง, เลขที่หนังสือ, E-contact DC, ประเภท, สำนักฯ รับเรื่อง, เจ้าหน้าที่ รับเรื่อง, เจ้าหน้าที่รับผิดชอบ, สถานะปัจจุบัน, หมายเหตุ`

## แผนดำเนินการ

1. **Backup** Apps Script source, Script Properties, deployment IDs และ URL; เก็บหลักฐานผลทดสอบก่อนเปลี่ยน
2. **Public**: ผู้ดูแลอนุมัติรายการชีต/คอลัมน์ที่เปิดเผยได้; สร้างข้อมูลส่งออกแบบจำกัดฟิลด์ หรือ aggregate ผ่าน backend ที่ควบคุมสิทธิ์ ห้ามนำ Google Sheet ต้นฉบับทั้งไฟล์ไป Publish to web เพื่อใช้กับ GitHub Pages
3. **SMT2**: ตั้ง `SMT2_SPREADSHEET_ID` เป็น ID ใหม่ใน **Script Properties เท่านั้น**; `SMT2_ALLOWED_SHEETS` เป็น 8 ชีตเจ้าหน้าที่; ตรวจ `SMT2_READER_EMAILS`, `SMT2_EDITOR_EMAILS`, `SMT2_READER_COLUMNS` ให้ครบ และต้องติดตั้ง adapter จริง
4. **ปิดช่องโหว่เดิม**: guard ทุก public server function เดิม เช่น `getServerData`, `getCombinedDashboardData`, `getUniqueColumnValues`, `updateRecord`, `addRecord`; ไม่พึ่ง UI หรือ client-side authorization; ยืนยันตัวตน fail closed; ปิด deployment เก่าที่เปิด Execute as Me / Anyone
5. **ทดสอบ** บัญชีไม่มีสิทธิ์ / reader / editor; paging, column projection, add/update, concurrent edits, audit log, formula injection, validation; ทดสอบ read-only ก่อนการเขียนลงต้นฉบับด้วยรายการทดสอบที่อนุมัติ
6. **ทดสอบกราฟ** เปรียบเทียบยอดแปลงและเนื้อที่ (ไร่-งาน-ตารางวา) ของมาตรา 93, 96 ทวิ, BOI, ศาสนา และที่ดินทอดทิ้งกับต้นฉบับโดยไม่เผยแพร่ข้อมูลรายเรื่อง
7. **Cutover** หลังผ่านทุก gate เท่านั้น: deploy Apps Script restricted, ทดสอบ Web App จริง, เปลี่ยน public feed ที่อนุมัติ, deploy GitHub Pages, ตรวจรับและเตรียม rollback

## Gate ก่อน Deploy

- ไม่มีการเข้าถึงข้อมูลส่วนบุคคลจาก GitHub Pages หรือ public CSV
- ยืนยันแล้วว่า Apps Script deployment ทุกตัวไม่เปิด endpoint ที่ข้ามสิทธิ์
- ไม่มีการ hardcode token / API key / private case data ลง GitHub
- มี URL/รูปแบบ public feed ที่อนุมัติและตรวจสอบได้จริง
- มีผลทดสอบผ่าน CI และตรวจรับโดยบัญชีผู้ใช้จริง

**เหตุผลที่ยังไม่เปลี่ยน URL CSV ใน index.html:** การแทนที่ด้วยลิงก์ชีตใหม่โดยตรงอาจทำให้ข้อมูลรายเรื่องเปิดเผยต่อสาธารณะ และยังไม่มีหลักฐานว่าชีตใหม่เผยแพร่ CSV เฉพาะฟิลด์ที่ได้รับอนุมัติแล้ว

## Rollback

เก็บ URL deployment Apps Script เดิมและไฟล์ config ก่อนเปลี่ยน; หากตรวจพบสิทธิ์ผิดพลาด ให้หยุด public feed / ย้อน GitHub commit และคืน Script Properties + deployment รุ่นที่ผ่านการตรวจรับ ไม่คืน deployment เดิมที่มีช่องโหว่
