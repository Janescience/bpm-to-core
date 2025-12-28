# Quick Start Guide - Dynamic Mapping Engine

## 🚀 การติดตั้งและเริ่มใช้งาน (5 นาที)

### ขั้นตอนที่ 1: Apply Database Schema

```bash
# เชื่อมต่อกับ Database
# แล้วรัน schema migration

# Option 1: ใช้ psql command line
psql postgresql://your_connection_string -f db/schema_v2_dynamic_mapping.sql

# Option 2: ใช้ SQL client (DBeaver, pgAdmin, etc.)
# เปิดไฟล์ db/schema_v2_dynamic_mapping.sql และรัน
```

**สิ่งที่ Schema จะทำ:**
- ✅ เพิ่ม indexes ให้ตาราง `bpm_soap_bocaller_parameters` (ที่มีอยู่แล้ว)
- ✅ สร้างตาราง `soap_custom_functions` (ใหม่)
- ✅ เพิ่มคอลัมน์ `function_type`, `function_params`, `description`, `is_active` ให้กับ:
  - `soap_template_mappings`
  - `soap_product_mappings`
- ✅ สร้าง Views และ Functions สำหรับ query

### ขั้นตอนที่ 2: ทดสอบ Mapping Engine

สร้าง mapping แบบง่ายเพื่อทดสอบ:

```sql
-- ตัวอย่าง: Gender mapping
INSERT INTO soap_template_mappings
(template_id, xml_path, parent_node, function_type, function_params, is_required, description)
VALUES
(
  1,  -- แก้ไขเป็น template_id ที่มีอยู่จริง
  'S2465.CLTSEX',
  'POLNBCRTIREC.S2465',
  'CONDITION',
  '{
    "jsonField": "eAPPDetails.0.Insured.0.Gender",
    "conditions": [
      {"operator": "==", "value": "MALE", "result": "M"},
      {"operator": "==", "value": "FEMALE", "result": "F"}
    ],
    "defaultValue": "U"
  }'::jsonb,
  true,
  'Gender mapping: MALE→M, FEMALE→F'
);
```

### ขั้นตอนที่ 3: ทดสอบผ่าน UI

1. เปิด browser ไปที่ `/products/[id]`
2. คลิก "Execute SOAP"
3. Upload JSON file ตัวอย่าง:

```json
{
  "eAPPDetails": [
    {
      "Insured": [
        {
          "Gender": "MALE",
          "FirstName": "สมชาย",
          "LastName": "ใจดี"
        }
      ]
    }
  ]
}
```

4. คลิก "Execute SOAP Request"
5. ตรวจสอบ XML output ว่ามี `<CLTSEX>M</CLTSEX>`

### ขั้นตอนที่ 4: เปลี่ยนใช้ API v2 (Optional)

ถ้าต้องการใช้ Dynamic Mapping Engine เต็มรูปแบบ:

```javascript
// แก้ไขใน frontend code (เช่น /products/[id]/page.js)
// เปลี่ยนจาก
const response = await fetch('/api/soap/execute', { ... });

// เป็น
const response = await fetch('/api/soap/execute-v2', { ... });
```

---

## 📖 ตัวอย่าง Mapping ที่ใช้บ่อย

### 1. Direct Mapping (Simple)

```sql
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.LGIVNAME', 'DIRECT',
 '{"jsonField": "eAPPDetails.0.Insured.0.FirstName", "defaultValue": ""}');
```

### 2. Static Value

```sql
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.ADDRTYPE', 'STATIC',
 '{"value": "P"}');
```

### 3. Date Format

```sql
-- Birth Year
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.CLTDOBX.CCYY', 'DATE',
 '{"jsonField": "eAPPDetails.0.Insured.0.Dob", "format": "CCYY", "defaultValue": "9999"}');

-- Birth Month
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.CLTDOBX.MM', 'DATE',
 '{"jsonField": "eAPPDetails.0.Insured.0.Dob", "format": "MM", "defaultValue": "99"}');
```

### 4. Config Lookup

```sql
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.SALUTL', 'CONFIG',
 '{"jsonField": "eAPPDetails.0.Insured.0.Salutation", "configKey": "INSURED", "fallbackToSource": true, "defaultValue": "103"}');
```

### 5. Thai Address Concatenation

```sql
-- Address Line 1 (0-30 chars)
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S2465.CLTADDR01', 'CONCAT',
 '{
   "fields": [
     {"jsonField": "eAPPDetails.0.Address.0.PlotNumber"},
     {"jsonField": "eAPPDetails.0.Address.0.BuildingName"},
     {"jsonField": "eAPPDetails.0.Address.0.MooNumber", "prefix": "ม."},
     {"jsonField": "eAPPDetails.0.Address.0.LaneSoi", "prefix": "ซอย "},
     {"jsonField": "eAPPDetails.0.Address.0.Road", "prefix": "ถนน "}
   ],
   "separator": " ",
   "startIndex": 0,
   "maxLength": 30
 }');
```

### 6. Complex JavaScript Logic

```sql
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params)
VALUES
(1, 'S4014.PAYPLAN', 'JSCODE',
 '{
   "code": "const payment = getNestedValue(data, ''eAPPDetails.0.Payment'');\n\nif (!payment) return ''D000'';\n\nif (payment.PayMethod === ''CREDITCARD'') {\n  if (payment.PayMode === ''MONTHLY'') return ''BI12'';\n  if ((payment.PayMode === ''ANNUAL'' || payment.PayMode === ''YEARLY'') && payment.EtrNumber === ''YES'') return ''BI01'';\n}\n\nreturn ''D000'';",
   "helpers": ["getNestedValue"]
 }');
```

---

## 🔧 Troubleshooting

### ปัญหา: Database error "column does not exist"

**แก้ไข:** ยังไม่ได้รัน schema migration

```bash
psql your_database -f db/schema_v2_dynamic_mapping.sql
```

### ปัญหา: Config lookup ไม่ทำงาน

**ตรวจสอบ:**
1. ข้อมูลใน `bpm_soap_bocaller_parameters` มีหรือไม่:
   ```sql
   SELECT * FROM bpm_soap_bocaller_parameters WHERE bpm_key = 'INSURED';
   ```

2. ตรวจสอบ indexes:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'bpm_soap_bocaller_parameters';
   ```

### ปัญหา: JSCODE ไม่ work

**ตรวจสอบ:**
1. Syntax error ใน JavaScript code
2. ต้อง escape single quote `'` เป็น `''` ใน SQL string
3. ตรวจสอบ helpers ที่ระบุมีอยู่จริง

**Debug:**
```javascript
// เพิ่ม console.log ใน code
"code": "console.log('Debug:', data);\nreturn 'TEST';"
```

แล้วดู server console

---

## 📚 เอกสารเพิ่มเติม

- **[DYNAMIC_MAPPING_GUIDE.md](DYNAMIC_MAPPING_GUIDE.md)** - คู่มือสมบูรณ์ทุก function
- **[MAPPING_EXAMPLES.json](MAPPING_EXAMPLES.json)** - 30+ ตัวอย่างพร้อมใช้
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Overview และ use cases
- **[MAPPING_DOCUMENTATION.md](MAPPING_DOCUMENTATION.md)** - Field specifications จาก Java

---

## ✅ Checklist

หลังจากติดตั้งเสร็จ ควรมี:

- [ ] ตาราง `soap_custom_functions` ถูกสร้าง
- [ ] คอลัมน์ `function_type`, `function_params` เพิ่มใน `soap_template_mappings`
- [ ] คอลัมน์ `function_type`, `function_params` เพิ่มใน `soap_product_mappings`
- [ ] Indexes เพิ่มใน `bpm_soap_bocaller_parameters`
- [ ] Database function `get_merged_mappings()` พร้อมใช้งาน
- [ ] ทดสอบ mapping ง่ายๆ ผ่าน UI แล้ว
- [ ] อ่าน DYNAMIC_MAPPING_GUIDE.md แล้ว

---

## 🎯 Next Steps

1. **ศึกษา Function Types** - อ่าน [DYNAMIC_MAPPING_GUIDE.md](DYNAMIC_MAPPING_GUIDE.md)
2. **Import Mappings** - Copy จาก [MAPPING_EXAMPLES.json](MAPPING_EXAMPLES.json)
3. **Test กับ JSON จริง** - ใช้ Execute SOAP modal
4. **Monitor Performance** - ดู query execution time

---

**🚀 พร้อมใช้งานแล้ว! ไม่ต้องแก้ Code อีกต่อไป!**
