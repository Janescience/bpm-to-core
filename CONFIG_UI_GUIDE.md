# Config Management UI - คู่มือการใช้งาน

## 🎯 จัดการ Config ผ่าน UI โดยไม่ต้องแก้ Code!

ระบบใหม่นี้ช่วยให้คุณสามารถจัดการ configuration parameters ทั้งหมดผ่าน UI ได้เลย ไม่ต้องเขียน helper functions หรือแก้ code อีกต่อไป!

---

## 📍 วิธีเข้าใช้งาน

1. เปิด browser ไปที่: **`http://localhost:3000/config`**
2. จะเห็นหน้าจอแบ่งเป็น 2 ส่วน:
   - **ซ้าย:** รายการ Config Keys (INSURED, RELATION, MARISTATUS, etc.)
   - **ขวา:** รายการ Config Values สำหรับ Key ที่เลือก

---

## 🆕 เพิ่ม Config ใหม่

### วิธีที่ 1: เพิ่มทีละรายการ

1. คลิกเลือก Config Key จากซ้ายมือ (เช่น `INSURED`)
2. คลิกปุ่ม **"+ Add New"**
3. กรอกข้อมูล:
   - **BPM Key:** ชื่อกลุ่ม config (เช่น `INSURED`, `RELATION`)
   - **System Type:** ระบบ (เลือก `NL` = New Life)
   - **Input:** รหัส AS400 (เช่น `101`, `S`, `01`)
   - **Output:** ค่า BPM ที่ต้องการ (เช่น `นาย`, `SINGLE`, `FATHER`)
   - **Description:** คำอธิบาย (เช่น `Mr.`, `Single`, `Father`)
4. คลิก **"Create"**

**ตัวอย่าง:**
```
BPM Key: INSURED
Input: 101
Output: นาย
Description: Mr.
System Type: NL
```

### วิธีที่ 2: Batch Import (นำเข้าหลายรายการพร้อมกัน)

1. คลิกปุ่ม **"Batch Import"** ที่ด้านล่างซ้าย
2. Paste JSON array:

```json
[
  {"input": "101", "output": "นาย", "description": "Mr."},
  {"input": "102", "output": "นาง", "description": "Mrs."},
  {"input": "103", "output": "นางสาว", "description": "Miss"},
  {"input": "104", "output": "เด็กชาย", "description": "Boy"},
  {"input": "105", "output": "เด็กหญิง", "description": "Girl"}
]
```

3. ระบุ BPM Key (เช่น `INSURED`)
4. คลิก OK
5. ระบบจะ import ทั้งหมดในครั้งเดียว!

---

## ✏️ แก้ไข Config

1. คลิกเลือก Config Key
2. คลิกปุ่ม **"Edit"** ในแถวที่ต้องการแก้ไข
3. แก้ไขข้อมูล
4. คลิก **"Update"**

---

## 🗑️ ลบ Config

1. คลิกเลือก Config Key
2. คลิกปุ่ม **"Delete"** ในแถวที่ต้องการลบ
3. ยืนยันการลบ

---

## 🔍 ดูรายการ Config ทั้งหมด

- ซ้ายมือจะแสดง Config Keys ทั้งหมดพร้อมจำนวน items
- คลิกที่ Key ใดก็ได้เพื่อดูรายละเอียด
- ข้อมูลจะแสดงเป็นตาราง: Input → Output

---

## 📋 ตัวอย่าง Config Keys ที่ใช้บ่อย

### 1. INSURED (Salutation - คำนำหน้าชื่อ)

| Input | Output | Description |
|-------|--------|-------------|
| 101 | นาย | Mr. |
| 102 | นาง | Mrs. |
| 103 | นางสาว | Miss |
| 104 | เด็กชาย | Boy |
| 105 | เด็กหญิง | Girl |

### 2. BENEF (Beneficiary Salutation)

| Input | Output | Description |
|-------|--------|-------------|
| 01 | นาย | Mr. (Beneficiary) |
| 02 | นาง | Mrs. (Beneficiary) |
| 03 | นางสาว | Miss (Beneficiary) |

### 3. RELATION (ความสัมพันธ์)

| Input | Output | Description |
|-------|--------|-------------|
| 01 | FATHER | Father |
| 02 | MOTHER | Mother |
| 03 | SPOUSE | Spouse |
| 04 | CHILD | Child |
| 05 | SIBLING | Brother/Sister |
| 99 | OTHER | Other |

### 4. MARISTATUS (สถานภาพ)

| Input | Output | Description |
|-------|--------|-------------|
| S | SINGLE | Single |
| M | MARRIED | Married |
| D | DIVORCED | Divorced |
| W | WIDOWED | Widowed |

### 5. CAMPCODE (Campaign)

| Input | Output | Description |
|-------|--------|-------------|
| C001 | CAMP01 | Campaign 2025 |
| C002 | CAMP02 | New Year Promotion |
| NY2025 | NEWYEAR2025 | New Year 2025 Special |

---

## 🔧 การใช้งานใน Mapping

หลังจากสร้าง config แล้ว สามารถใช้ใน mapping ได้ทันที:

### ตัวอย่าง: Lookup Salutation

```sql
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.SALUTL', 'CONFIG',
 '{
   "jsonField": "eAPPDetails.0.Insured.0.SalutationCode",
   "configKey": "INSURED",
   "fallbackToSource": false,
   "defaultValue": ""
 }');
```

**การทำงาน:**
- รับค่า `SalutationCode` จาก JSON (เช่น `"101"`)
- Lookup จาก `bpm_soap_bocaller_parameters` WHERE `input = "101"`
- ได้ `output = "นาย"`
- ส่งค่า `"นาย"` ไปใน XML

---

## 🚀 API Endpoints (สำหรับ Integration)

### GET /api/config
Get all config keys or values for specific key

```javascript
// Get all keys
fetch('/api/config')

// Get values for specific key
fetch('/api/config?bpm_key=INSURED&system_type=NL')
```

### POST /api/config
Create or update config

```javascript
fetch('/api/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bpm_key: 'INSURED',
    input: '101',
    output: 'นาย',
    description: 'Mr.',
    system_type: 'NL'
  })
})
```

### DELETE /api/config
Delete config by ID or key+input

```javascript
// By ID
fetch('/api/config?id=123', { method: 'DELETE' })

// By key + input
fetch('/api/config?bpm_key=INSURED&input=101', { method: 'DELETE' })
```

### POST /api/config/batch
Batch import configs

```javascript
fetch('/api/config/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bpm_key: 'INSURED',
    system_type: 'NL',
    mappings: [
      { input: '101', output: 'นาย', description: 'Mr.' },
      { input: '102', output: 'นาง', description: 'Mrs.' }
    ]
  })
})
```

---

## 💡 Tips & Best Practices

### 1. ตั้งชื่อ BPM Key ให้สื่อความหมาย
- ✅ `INSURED`, `BENEF`, `RELATION`
- ❌ `CONFIG1`, `MAP_A`

### 2. ใส่ Description ทุกครั้ง
ช่วยให้เข้าใจได้ง่ายว่า input/output แต่ละค่าคืออะไร

### 3. ใช้ System Type แยกตามระบบ
- `NL` = New Life
- `GL` = Group Life
- สามารถมีค่าเดียวกันใน input แต่ system_type ต่างกันได้

### 4. Backup Config ก่อนแก้ไข
Export เป็น JSON ไว้ก่อนแก้ไขครั้งใหญ่:

```javascript
// Run in browser console
const configs = await fetch('/api/config?bpm_key=INSURED').then(r => r.json())
console.log(JSON.stringify(configs.data, null, 2))
```

### 5. ใช้ Batch Import สำหรับข้อมูลจำนวนมาก
แทนที่จะเพิ่มทีละรายการ ใช้ Batch Import จะเร็วกว่า

---

## ❓ FAQ

### Q: ถ้าต้องการเพิ่ม Config Key ใหม่ทั้งหมด จะทำอย่างไร?
A: แค่สร้าง config รายการแรกด้วย BPM Key ใหม่ ระบบจะสร้าง Key ให้อัตโนมัติ

### Q: Config ที่สร้างจะมีผลทันทีหรือไม่?
A: ใช่! ระบบมี caching 15 นาที แต่สามารถ clear cache ได้ด้วย API หรือรอให้ cache หมดอายุเอง

### Q: สามารถมี Input ซ้ำกันได้ไหม?
A: ไม่ได้ ระบบมี UNIQUE constraint: `(bpm_key, input, system_type)` ต้องไม่ซ้ำกัน

### Q: ต้องแก้ code ที่ไหนบ้างถ้าเพิ่ม config ใหม่?
A: **ไม่ต้องแก้ code เลย!** แค่สร้างผ่าน UI แล้วใช้ function type `CONFIG` ใน mapping

### Q: Export ข้อมูลเป็น Excel ได้ไหม?
A: ตอนนี้ยัง แต่สามารถ copy จากตารางวางใน Excel ได้ หรือใช้ API export เป็น JSON ก่อนแล้วค่อย convert

---

## ✅ สรุป

ด้วย Config Management UI คุณสามารถ:
- ✅ เพิ่ม/แก้ไข/ลบ config ผ่าน UI
- ✅ Import ข้อมูลจำนวนมากด้วย JSON
- ✅ ไม่ต้องเขียน helper functions
- ✅ ไม่ต้องแก้ code ทุกครั้งที่มี config ใหม่
- ✅ มี API สำหรับ integration
- ✅ มี caching เพื่อ performance

**🎉 ลองใช้ได้เลยที่: `/config`**
