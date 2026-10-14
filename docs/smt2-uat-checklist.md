# LandRight–SMT2 UAT Checklist — 14 ตุลาคม 2569

แบบฟอร์มว่างสำหรับผู้ดูแล ไม่ใช่ผล UAT บัญชีจริงที่ผ่านแล้ว
เก็บสำเนาที่กรอกไว้นอก repository และช่องทางสาธารณะ
ใช้ role A/B แทนอีเมล ห้ามแนบ token, HAR, ภาพตารางจริง หรือข้อมูลรายเรื่อง

SHA ที่เปิดทดสอบ: __________  วันที่/เวลา (Asia/Bangkok): __________
Browser/version: __________  ระบบปฏิบัติการ/อุปกรณ์: __________
โหมด: [ ] Synthetic [ ] Live แฟ้มจำลอง [ ] Live แหล่งที่ยืนยันแบบ read-only
ไฟล์ UAT มีเฉพาะข้อมูลจำลอง: [ ] ยืนยัน [ ] ไม่ใช้ (อ่านต้นฉบับที่ผู้ดูแลยืนยัน)
ผู้ทดสอบ (role/รหัส ไม่ใส่อีเมล): __________

ผล: P=ผ่าน, F=ไม่ผ่าน, N=ยังไม่รัน, B=ติด prerequisite
ค่าเริ่มต้นทุกช่องคือว่าง ไม่ถือว่าผ่านจากผล automated tests

| ID | ขั้นตอน/เกณฑ์ผ่าน | P/F/N/B | หมายเหตุที่ไม่มีข้อมูลส่วนตัว |
| --- | --- | --- | --- |
| G01 | รับทราบ Restricted sharing และ OAuth settings ที่ผู้ดูแลยืนยัน 14 ต.ค.; เป็น attestation ไม่ใช่ Codex ตรวจ Console | | |
| G02 | Live เลือกไฟล์จำลอง Restricted หรือ --use-approved-source อย่างชัดเจน; ไม่เปลี่ยน sharing/data | | |
| G03 | Origin ที่เปิดตรงกับ Authorized JavaScript Origin ที่มีอยู่ เช่น localhost:8000; ถ้าไม่ตรงให้ B | | |
| G04 | บัญชี A มีสิทธิ์ UAT file และใช้ OAuth client ได้; บัญชี B ใช้ OAuth client ได้แต่ไม่มีสิทธิ์ไฟล์ | | |
| S01 | Synthetic banner แสดงชัดว่าไม่ใช่ OAuth จริง; ข้อมูลเป็นเรื่องจำลองเท่านั้น | | |
| S02 | ก่อนกดเข้า SMT2 ไม่มี private request/records; server ไม่มี directory listing/.git/source docs | | |
| S03 | Synthetic allowed แสดง 488 records, กรองหนึ่งชีตได้ 61 และสถานะเสร็จแล้วได้ 30 | | |
| S04 | Synthetic denied แสดงข้อความปฏิเสธ ไม่เหลือข้อมูล/เมนู private | | |
| A01 | Live บัญชี A เปิด SMT2 และเปิด Google popup; เลือกบัญชีถูกต้อง ยินยอม readonly | | |
| A02 | Login สำเร็จ อ่านครบ 8 tabs; ไม่ถือว่าแค่ HTTP 200 เท่ากับผ่าน data validation | | |
| A03 | ปิด popup/ไม่ยินยอม/ปิดกั้น popup แล้วมี error ชัดเจนและลองใหม่ได้ | | |
| N01 | Incognito ไม่ login เปิด SMT2 ได้เฉพาะ entry ไม่มีข้อมูลและไม่เรียก private Sheets API | | |
| N02 | บัญชี B ที่มี valid OAuth แต่ไม่มี file permission ถูก Sheets API ปฏิเสธ; ไม่มีข้อมูลใน DOM | | |
| N03 | ทดสอบ API GET โดยตรงด้วย token บัญชี B อย่างส่วนตัว ต้องไม่ส่ง rows; บันทึกเฉพาะ status | | |
| N04 | หาก Google ปฏิเสธ B ก่อน API เพราะ test-user/consent policy ให้บันทึก B ไม่ถือว่าทดสอบ file ACL ผ่าน | | |
| D01 | ทั้ง 8 ชีตตรงชื่อและหัวตารางที่รู้จัก ไม่มี warning ที่ยังไม่วินิจฉัย | | |
| D02 | จำนวนแถวไม่ว่าง/สถานะตรงกับ UAT file รวมแถวเกิน 1,000 ถ้ามี; ไม่แก้ source rows | | |
| F01 | ค้นหาข้อความ/เลขหนังสือ/จังหวัด/เจ้าหน้าที่ และผลไม่พบ ใช้งานถูกต้อง | | |
| F02 | กรองชีต+สถานะ+จังหวัดพร้อมกัน และล้างตัวกรองได้ | | |
| F03 | Dashboard จำนวนรวม/byStatus/bySheet ตรงกับ records หลังกรอง ไม่เดาความหมายสถานะ | | |
| F04 | แบ่งหน้า/ค้นหาจากหน้าหลังแล้วกลับหน้าแรก ไม่มีรายการตกหล่นหรือหน้าว่างผิดปกติ | | |
| F05 | Refresh แสดงข้อมูลถูกต้องและไม่มี record ค้างเมื่อ API/network ล้มเหลว | | |
| L01 | Logout ล้างตาราง/Dashboard/token ใน memory และไม่เก็บใน local/session storage | | |
| L02 | Reload/Back/Forward/expiry ต้องไม่คืนข้อมูลจาก session เก่า; Google cookie อาจยัง login อยู่ | | |
| L03 | Logout ระหว่างโหลดแล้ว response ที่มาช้าไม่ทำให้ข้อมูลกลับมา | | |
| V01 | Desktop: เมนู ตาราง Dashboard keyboard/focus และข้อความ error อ่านได้ | | |
| V02 | Mobile viewport: overlay เปิด/ปิด, ตารางเลื่อนเฉพาะแนวนอน, filter ปุ่มไม่ล้น | | |
| V03 | มือถือจริงที่เปิด loopback ได้: popup/บัญชี/consent/login/logout ใช้งานได้ | | |
| V04 | หาก iPhone/อุปกรณ์เปิด loopback ไม่ได้ ให้ N/B; responsive emulation ไม่แทน OAuth บนมือถือจริง | | |
| P01 | ไม่มี public tunnel, network binding, write API, server proxy หรือไฟล์ผลที่มีข้อมูลจริงเผยแพร่ | | |

## ตรวจรายชีต (ถ้าอ่านต้นฉบับให้เก็บผลภายในเท่านั้น)

| ชีต | แถวไม่ว่างที่คาด | แถวที่แอปอ่าน | Header mapping ผ่าน/ไม่ผ่าน | P/F/N/B |
| --- | --- | --- | --- | --- |
| การะเกด | | | | |
| ชยาน์ขวัญ | | | | |
| ฉัตรพร | | | | |
| ภทรพงค์ | | | | |
| สกุลวรรณ | | | | |
| ปิยะพงษ์ | | | | |
| เทอดพงศ์ | | | | |
| โสภา | | | | |

รวม P: ___ F: ___ N: ___ B: ___
ข้อผิดพลาดที่ต้องแก้ (ไม่มีข้อมูลจริง): ____________________
ผล UAT: [ ] ผ่าน [ ] ไม่ผ่าน [ ] ยังไม่ครบ
การ Deploy/เปลี่ยน Production settings ไม่อยู่ในขอบเขตแบบฟอร์มนี้
