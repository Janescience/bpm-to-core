# 🎉 Custom Functions System - Complete Guide

## ✅ ระบบครบแล้ว! สร้าง Function เองได้โดยไม่ต้องแก้ Code

---

## 🚀 สิ่งที่ทำเสร็จแล้ว

### 1. ✅ **Custom Functions Management**
- **UI**: `/functions` - หน้าจัดการ custom functions
- **API**: `/api/functions` - CRUD operations
- **Database**: `soap_custom_functions` table

### 2. ✅ **Config Parameters Management**
- **UI**: `/config` - หน้าจัดการ config parameters
- **API**: `/api/config` - CRUD operations
- **Database**: `bpm_soap_bocaller_parameters` table (มีอยู่แล้ว)

### 3. ✅ **Dynamic Mapping Engine**
- รองรับ 14 function types:
  - DIRECT, STATIC, CONDITION, CONDITION_MULTIPLE
  - CONCAT, SUBSTRING, DATE, NUMBER
  - CONFIG, PRIORITY, ARRAY, EXPRESSION
  - JSCODE, **CUSTOM** ← ใหม่!
- ไฟล์: `lib/mappingEngine.js`

### 4. ✅ **API Updates**
- `/api/mappings/template` - รองรับ `function_type`, `function_params`
- `/api/mappings/product` - รองรับ `function_type`, `function_params`

### 5. ✅ **Database Schema**
- เพิ่ม columns ใน `soap_template_mappings`:
  - `function_type` (varchar)
  - `function_params` (jsonb)
  - `description` (text)
  - `is_active` (boolean)
- เพิ่ม columns ใน `soap_product_mappings`: เหมือนข้างบน
- Table `soap_custom_functions` สำหรับเก็บ user-defined functions

### 6. ✅ **UI Components**
- `MappingForm.js` - Component สำหรับสร้าง/แก้ไข mappings รองรับทุก function types

---

## 📖 วิธีใช้งาน

### 🎯 สร้าง Custom Function

1. **เข้าหน้า Custom Functions**
   ```
   http://localhost:3000/functions
   ```

2. **คลิก "+ New Function"**

3. **กรอกข้อมูล:**
   - **Function Name**: `calculateAge` (ต้องเป็น alphanumeric และ underscore เท่านั้น)
   - **Description**: "คำนวณอายุจากวันเกิด"
   - **Parameters**: (Optional)
     - Name: `birthDate`, Type: `string`, Description: "วันเกิด YYYY-MM-DD"
   - **JavaScript Code**:
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

4. **คลิก "🧪 Test Function"** เพื่อทดสอบด้วย sample data:
   ```json
   {"birthDate": "1990-05-15"}
   ```

5. **คลิก "Create Function"**

---

### 🗺️ ใช้ Custom Function ใน Mapping

1. **เข้าหน้า Template**
   ```
   http://localhost:3000/templates/[id]
   ```

2. **เลือก XML field** ที่ต้องการ map (เช่น `S2465.AGE`)

3. **ใน Mapping Form:**
   - **Function Type**: เลือก `CUSTOM - User function`
   - **Function Parameters**:
     ```json
     {
       "functionName": "calculateAge",
       "functionParams": {}
     }
     ```
   - **Description**: "คำนวณอายุจากวันเกิด"

4. **คลิก "Add Mapping"**

5. **คลิก "บันทึกทั้งหมด"**

---

### 📊 ใช้ Config Lookup

สำหรับ mapping ที่ต้อง lookup จากฐานข้อมูล config:

1. **สร้าง Config ที่ `/config`:**
   - BPM Key: `INSURED`
   - Input: `101`, Output: `นาย`, Description: `Mr.`
   - Input: `102`, Output: `นาง`, Description: `Mrs.`

2. **ใช้ใน Mapping:**
   - **Function Type**: `CONFIG - Database lookup`
   - **Function Parameters**:
     ```json
     {
       "jsonField": "salutationCode",
       "configKey": "INSURED",
       "fallbackToSource": false
     }
     ```

---

## 🛠️ ตัวอย่าง Custom Functions

### 1. คำนวณอายุ

```javascript
const birthDate = new Date(data.birthDate);
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
return age.toString();
```

### 2. Format ที่อยู่แบบไทย

```javascript
const addr = data.address;
if (!addr) return "";

const parts = [];
if (addr.PlotNumber) parts.push(addr.PlotNumber);
if (addr.MooNumber) parts.push("ม." + addr.MooNumber);
if (addr.LaneSoi) parts.push("ซอย " + addr.LaneSoi);
if (addr.Road) parts.push("ถนน " + addr.Road);
if (addr.District) parts.push("ตำบล " + addr.District);

return parts.join(" ");
```

### 3. คำนวณ Payment Plan

```javascript
const payment = data.payment;
if (!payment) return "D000";

if (payment.method === "CREDITCARD") {
  if (payment.mode === "MONTHLY") return "BI12";
  if (payment.mode === "YEARLY" && payment.etr === "YES") return "BI01";
}

return "D000";
```

### 4. Format เบอร์โทร

```javascript
const phone = data.phone;
if (!phone) return "";

// Remove all non-digits
const cleaned = phone.replace(/\D/g, '');

// Format as 0XX-XXX-XXXX
if (cleaned.length === 10) {
  return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
}

return cleaned;
```

### 5. แปลง Boolean เป็น Y/N

```javascript
const value = data.hasInsurance;
if (value === true || value === "true" || value === "1") {
  return "Y";
}
return "N";
```

---

## 🎨 ตัวอย่างการใช้ Function Types อื่นๆ

### CONDITION (If-Else)

```json
{
  "function_type": "CONDITION",
  "function_params": {
    "jsonField": "gender",
    "operator": "==",
    "compareValue": "M",
    "trueValue": "Male",
    "falseValue": "Female"
  }
}
```

### CONCAT (รวม String)

```json
{
  "function_type": "CONCAT",
  "function_params": {
    "fields": ["firstName", "lastName"],
    "separator": " "
  }
}
```

### DATE (แปลงวันที่)

```json
{
  "function_type": "DATE",
  "function_params": {
    "jsonField": "birthDate",
    "inputFormat": "YYYY-MM-DD",
    "outputFormat": "DD/MM/YYYY"
  }
}
```

### PRIORITY (เลือกค่าแรกที่ไม่ว่าง)

```json
{
  "function_type": "PRIORITY",
  "function_params": {
    "fields": ["mobilePhone", "homePhone", "officePhone"]
  }
}
```

---

## 🔒 Security

### Custom Functions
- JavaScript code ถูก execute ใน sandboxed environment
- ไม่สามารถเข้าถึง file system หรือ network
- มีเฉพาะ `data` และ `params` variables

### Validation
- Function name ต้องเป็น alphanumeric และ underscore เท่านั้น
- JavaScript syntax จะถูก validate ก่อนบันทึก
- Inactive functions จะไม่ถูก execute

---

## 📁 ไฟล์ที่เกี่ยวข้อง

### Backend
- `lib/mappingEngine.js` - Core transformation engine
- `lib/configLookup.js` - Config database lookup
- `app/api/functions/route.js` - Custom functions API
- `app/api/config/route.js` - Config parameters API
- `app/api/config/batch/route.js` - Batch config operations
- `app/api/mappings/template/route.js` - Template mappings API
- `app/api/mappings/product/route.js` - Product mappings API

### Frontend
- `app/functions/page.js` - Custom functions management UI
- `app/config/page.js` - Config parameters management UI
- `app/components/MappingForm.js` - Mapping form component
- `app/templates/[id]/page.js` - Template detail page
- `app/products/[id]/page.js` - Product detail page

### Database
- `db/schema.sql` - Complete database schema

### Documentation
- `DYNAMIC_MAPPING_GUIDE.md` - Function types documentation
- `CONFIG_UI_GUIDE.md` - Config management guide
- `UI_UPDATE_GUIDE.md` - UI update instructions
- `MAPPING_EXAMPLES.json` - Example configurations

---

## ✨ สรุป

ตอนนี้คุณสามารถ:

- ✅ สร้าง custom functions ผ่าน UI โดยไม่ต้องแก้ code
- ✅ สร้าง config parameters ผ่าน UI โดยไม่ต้องแก้ code
- ✅ ใช้ function types ทั้งหมด 14 แบบ
- ✅ ทำ data transformation ซับซ้อนได้ทุกรูปแบบ
- ✅ ไม่ต้องแก้ code เมื่อมี business logic ใหม่

**🎉 ระบบ Dynamic Mapping พร้อมใช้งาน!**

---

## 📞 หากมีปัญหา

1. ตรวจสอบ database schema (run `db/schema.sql`)
2. ตรวจสอบ browser console สำหรับ errors
3. ตรวจสอบ server logs
4. ดูตัวอย่างใน `MAPPING_EXAMPLES.json`
5. อ่าน `DYNAMIC_MAPPING_GUIDE.md` สำหรับรายละเอียด function types

---

**Last Updated**: 2025-12-25
