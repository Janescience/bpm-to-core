# วิธีใช้งาน Custom Functions และ Config ใน Template/Product

## 🎯 ภาพรวม

คุณมี 2 วิธีในการใช้งาน:
1. **ใช้ UI แบบเก่า** - แก้ไข mappings ผ่าน JSON (ทำได้เลยตอนนี้)
2. **อัพเดต UI ใหม่** - ใช้ form สวยงาม dropdown เลือก function type

---

## 🚀 วิธีที่ 1: ใช้ผ่าน JSON (ทำได้เลย!)

### ขั้นตอน:

1. **สร้าง Custom Function ที่ `/functions`**
   ```javascript
   Function Name: calculateAge
   Code:
   const birthDate = new Date(data.birthDate);
   const today = new Date();
   let age = today.getFullYear() - birthDate.getFullYear();
   return age.toString();
   ```

2. **สร้าง Config ที่ `/config`**
   ```
   BPM Key: INSURED
   Input: 101 → Output: นาย
   Input: 102 → Output: นาง
   ```

3. **ไปที่ Template/Product** และแก้ mapping โดยตรงในฐานข้อมูล:

```sql
-- ตัวอย่างที่ 1: ใช้ CONFIG Lookup
UPDATE soap_template_mappings
SET
  function_type = 'CONFIG',
  function_params = '{"jsonField": "salutationCode", "configKey": "INSURED", "fallbackToSource": false}'
WHERE template_id = 1
  AND xml_path = 'S2465.SALUTL';

-- ตัวอย่างที่ 2: ใช้ CUSTOM Function
UPDATE soap_template_mappings
SET
  function_type = 'CUSTOM',
  function_params = '{"functionName": "calculateAge"}'
WHERE template_id = 1
  AND xml_path = 'S2465.AGE';

-- ตัวอย่างที่ 3: ใช้ CONDITION
UPDATE soap_template_mappings
SET
  function_type = 'CONDITION',
  function_params = '{
    "jsonField": "gender",
    "operator": "==",
    "compareValue": "M",
    "trueValue": "Male",
    "falseValue": "Female"
  }'
WHERE template_id = 1
  AND xml_path = 'S2465.GENDER';

-- ตัวอย่างที่ 4: ใช้ CONCAT
UPDATE soap_template_mappings
SET
  function_type = 'CONCAT',
  function_params = '{
    "fields": ["firstName", "lastName"],
    "separator": " "
  }'
WHERE template_id = 1
  AND xml_path = 'S2465.FULLNAME';

-- ตัวอย่างที่ 5: ใช้ DATE
UPDATE soap_template_mappings
SET
  function_type = 'DATE',
  function_params = '{
    "jsonField": "birthDate",
    "inputFormat": "YYYY-MM-DD",
    "outputFormat": "DD/MM/YYYY"
  }'
WHERE template_id = 1
  AND xml_path = 'S2465.BIRTHDATE';
```

### ดูข้อมูล Template ที่มี:

```sql
-- ดู templates ทั้งหมด
SELECT id, template_name FROM soap_templates;

-- ดู mappings ของ template
SELECT
  xml_path,
  json_field,
  function_type,
  function_params,
  default_value
FROM soap_template_mappings
WHERE template_id = 1
ORDER BY xml_path;
```

---

## 🎨 วิธีที่ 2: อัพเดต UI (สวยงามกว่า)

เนื่องจากหน้า Template/Product มีโค้ดยาวมาก ผมแนะนำให้ทำทีละขั้นตอน:

### Step 1: เพิ่ม State สำหรับ Function Fields

เปิดไฟล์ `app/templates/[id]/page.js` หรือ `app/products/[id]/page.js`

**เพิ่ม state หลังบรรทัดที่มี `useState` อยู่แล้ว:**

```javascript
const [functionType, setFunctionType] = useState('DIRECT')
const [functionParams, setFunctionParams] = useState({})
const [description, setDescription] = useState('')
const [isActive, setIsActive] = useState(true)
```

### Step 2: เพิ่ม Dropdown Function Type ในฟอร์ม

**หาส่วนที่มี:**
```javascript
<label className="block text-sm font-medium text-gray-700 mb-1">
  JSON Field Path
</label>
```

**เพิ่มก่อนหน้านั้น:**

```javascript
{/* Function Type Dropdown */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Function Type
  </label>
  <select
    value={functionType}
    onChange={(e) => setFunctionType(e.target.value)}
    className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
  >
    <option value="DIRECT">Direct - Simple mapping</option>
    <option value="STATIC">Static - Fixed value</option>
    <option value="CONFIG">Config - Database lookup</option>
    <option value="CUSTOM">Custom - User function</option>
    <option value="CONDITION">Condition - If-else</option>
    <option value="CONCAT">Concat - Join strings</option>
    <option value="DATE">Date - Format dates</option>
    <option value="NUMBER">Number - Format numbers</option>
  </select>
</div>

{/* Function Parameters (show when not DIRECT) */}
{functionType !== 'DIRECT' && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Function Parameters (JSON)
    </label>
    <textarea
      value={JSON.stringify(functionParams, null, 2)}
      onChange={(e) => {
        try {
          setFunctionParams(JSON.parse(e.target.value))
        } catch (err) {
          // Invalid JSON
        }
      }}
      className="w-full p-3 border border-black font-mono text-sm"
      rows={6}
      placeholder='{"jsonField": "fieldName", "configKey": "INSURED"}'
    />
    <div className="text-xs text-gray-500 mt-1">
      ตัวอย่าง CONFIG: {`{"jsonField": "salutationCode", "configKey": "INSURED"}`}<br/>
      ตัวอย่าง CUSTOM: {`{"functionName": "calculateAge"}`}
    </div>
  </div>
)}
```

### Step 3: อัพเดต handleAddMapping

**หาฟังก์ชัน `handleAddMapping` หรือ `handleAddOverride`**

**เปลี่ยนจาก:**
```javascript
const newMapping = {
  xml_path: selectedNode.path,
  xml_name: selectedNode.name,
  json_field: jsonField || null,
  xml_type: selectedNode.type,
  is_required: selectedNode.required,
  default_value: defaultValue || null
}
```

**เป็น:**
```javascript
const newMapping = {
  xml_path: selectedNode.path,
  xml_name: selectedNode.name,
  json_field: jsonField || null,
  xml_type: selectedNode.type,
  is_required: selectedNode.required,
  default_value: defaultValue || null,
  function_type: functionType,        // ← เพิ่ม
  function_params: functionParams,    // ← เพิ่ม
  description: description,           // ← เพิ่ม
  is_active: isActive                 // ← เพิ่ม
}
```

### Step 4: Reset Form

**หาส่วนที่ reset form (เมื่อเลือก node ใหม่)**

**เพิ่มการ reset state:**
```javascript
setFunctionType('DIRECT')
setFunctionParams({})
setDescription('')
setIsActive(true)
```

---

## 📖 ตัวอย่างการใช้งานจริง

### ตัวอย่างที่ 1: Lookup คำนำหน้าชื่อ

**Scenario:** แปลง salutation code (101, 102) เป็นภาษาไทย (นาย, นาง)

**ขั้นตอน:**

1. **สร้าง Config:**
   - ไป `/config`
   - BPM Key: `INSURED`
   - เพิ่ม:
     - Input: `101` → Output: `นาย`
     - Input: `102` → Output: `นาง`
     - Input: `103` → Output: `นางสาว`

2. **ใช้ใน Mapping:**
   ```sql
   UPDATE soap_template_mappings
   SET
     function_type = 'CONFIG',
     function_params = '{
       "jsonField": "eAPPDetails.0.Insured.0.SalutationCode",
       "configKey": "INSURED",
       "fallbackToSource": false
     }',
     description = 'Lookup salutation from config'
   WHERE xml_path = 'S2465.SALUTL';
   ```

### ตัวอย่างที่ 2: คำนวณอายุ

**Scenario:** คำนวณอายุจากวันเกิด

**ขั้นตอน:**

1. **สร้าง Custom Function:**
   - ไป `/functions`
   - Function Name: `calculateAge`
   - Code:
     ```javascript
     const birthDate = new Date(data.birthDate);
     const today = new Date();
     let age = today.getFullYear() - birthDate.getFullYear();
     const monthDiff = today.getMonth() - birthDate.getMonth();
     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
       age--;
     }
     return age.toString();
     ```

2. **ใช้ใน Mapping:**
   ```sql
   UPDATE soap_template_mappings
   SET
     function_type = 'CUSTOM',
     function_params = '{"functionName": "calculateAge"}',
     description = 'Calculate age from birth date'
   WHERE xml_path = 'S2465.AGE';
   ```

### ตัวอย่างที่ 3: รวมชื่อ-นามสกุล

**Scenario:** รวม firstName + lastName เป็น fullName

**ใช้ใน Mapping:**
```sql
UPDATE soap_template_mappings
SET
  function_type = 'CONCAT',
  function_params = '{
    "fields": ["eAPPDetails.0.Insured.0.FirstName", "eAPPDetails.0.Insured.0.LastName"],
    "separator": " "
  }',
  description = 'Concatenate first name and last name'
WHERE xml_path = 'S2465.FULLNAME';
```

### ตัวอย่างที่ 4: เงื่อนไข Payment Method

**Scenario:** ถ้า PayMethod = "CREDITCARD" ให้ส่ง "CC" ไม่งั้นส่ง "CASH"

**ใช้ใน Mapping:**
```sql
UPDATE soap_template_mappings
SET
  function_type = 'CONDITION',
  function_params = '{
    "jsonField": "eAPPDetails.0.Payment.PayMethod",
    "operator": "==",
    "compareValue": "CREDITCARD",
    "trueValue": "CC",
    "falseValue": "CASH"
  }',
  description = 'Map payment method to code'
WHERE xml_path = 'S2465.PAYMETHOD';
```

---

## 🧪 ทดสอบการทำงาน

### 1. ดู Mapping ที่มี Function Type

```sql
SELECT
  xml_path,
  function_type,
  function_params::text,
  description
FROM soap_template_mappings
WHERE template_id = 1
  AND function_type != 'DIRECT'
ORDER BY xml_path;
```

### 2. ทดสอบ Execute SOAP

1. ไปที่ `/products/[id]`
2. คลิก "⚡ Execute SOAP"
3. Upload JSON file หรือเลือกจาก log
4. Execute แล้วดู XML output

---

## 💡 Tips

### ✅ ควรทำ:
- ใช้ description เพื่ออธิบาย mapping แต่ละอัน
- Test custom function ด้วยปุ่ม "🧪 Test" ก่อน save
- สร้าง config ครบก่อนใช้ใน mapping
- ใช้ `is_active = false` แทนการลบ mapping

### ❌ ไม่ควรทำ:
- ห้ามแก้ function_params แบบ manual ถ้าไม่แน่ใจว่า JSON ถูกต้อง
- ห้าม hardcode ค่าที่ควรเป็น config
- ห้ามใช้ CUSTOM function สำหรับเคสที่มี function type อื่นรองรับอยู่แล้ว

---

## 🎯 สรุป

**ตอนนี้ใช้ได้แล้ว!**

1. **แบบง่าย**: แก้ database โดยตรงด้วย SQL
2. **แบบสวย**: รอแก้ UI (หรือใช้ MappingForm component ที่ผมสร้างไว้)

**Function Types ที่มี:**
- DIRECT ✅
- STATIC ✅
- CONFIG ✅ (ใช้กับ `/config`)
- CUSTOM ✅ (ใช้กับ `/functions`)
- CONDITION ✅
- CONCAT ✅
- DATE ✅
- NUMBER ✅
- และอีก 5 แบบ...

**ต้องการความช่วยเหลือ?**
- ดู `DYNAMIC_MAPPING_GUIDE.md` สำหรับ function types ทั้งหมด
- ดู `MAPPING_EXAMPLES.json` สำหรับตัวอย่าง
- ดู `CUSTOM_FUNCTIONS_COMPLETE.md` สำหรับวิธีใช้ custom functions

🎉 **Happy Mapping!**
