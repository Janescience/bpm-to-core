# 🔗 Array Filter & Function Chaining Guide

## 📋 ภาพรวม

เพิ่มฟีเจอร์ใหม่ 2 ตัวเพื่อรองรับ use case ที่ซับซ้อนขึ้น:

1. **ARRAY_FILTER** - กรอง array data ตาม condition และเลือก field
2. **CHAIN** - เชื่อม functions หลายตัวเข้าด้วยกัน

---

## 🎯 1. ARRAY_FILTER Function

### ใช้สำหรับ:
- กรอง array ตาม condition
- เลือก item ที่ตรงเงื่อนไข
- ดึง field เฉพาะจาก item ที่กรอง

### ตัวอย่าง Use Case:
```
จาก JSON:
{
  "eAPPDetails": [{
    "Address": [
      { "Type": "HOME", "Street": "123 Main St", "City": "Bangkok" },
      { "Type": "WORK", "Street": "456 Office Rd", "City": "Bangkok" },
      { "Type": "HOME", "Street": "789 House Ave", "City": "Phuket" }
    ]
  }]
}

ต้องการ: Street ของ Address ที่เป็น Type = "HOME" อันแรก
ผลลัพธ์: "123 Main St"
```

### Parameters:

```json
{
  "jsonField": "eAPPDetails.0.Address",
  "filterField": "Type",
  "filterOperator": "==",
  "filterValue": "HOME",
  "selectField": "Street",
  "selectIndex": 0
}
```

#### Parameter Details:

| Parameter | ต้องระบุ | คำอธิบาย | ตัวอย่าง |
|-----------|---------|----------|----------|
| `jsonField` | ✅ | Path ไปยัง array | `"eAPPDetails.0.Address"` |
| `filterField` | ✅ | Field ที่ใช้กรอง | `"Type"` |
| `filterOperator` | ❌ | Operator (default: `==`) | `"=="`, `"!="`, `"contains"` |
| `filterValue` | ✅ | ค่าที่ใช้เปรียบเทียบ | `"HOME"` |
| `selectField` | ❌ | Field ที่จะดึงออกมา (ไม่ระบุ = ได้ทั้ง object) | `"Street"` |
| `selectIndex` | ❌ | Index ของ item ที่กรองได้ (default: 0) | `0`, `1`, `2` |
| `defaultValue` | ❌ | ค่า default ถ้าไม่เจอ | `""` |

### Supported Operators:

- `==`, `equals` - เท่ากับ
- `!=`, `notEquals` - ไม่เท่ากับ
- `>`, `greaterThan` - มากกว่า
- `<`, `lessThan` - น้อยกว่า
- `contains` - มีคำนี้อยู่ใน string
- `startsWith` - เริ่มต้นด้วย
- `endsWith` - ลงท้ายด้วย

### ตัวอย่างการใช้งาน:

#### ตัวอย่างที่ 1: Filter Address Type
```json
{
  "functionType": "ARRAY_FILTER",
  "functionParams": {
    "jsonField": "eAPPDetails.0.Address",
    "filterField": "Type",
    "filterValue": "HOME",
    "selectField": "Street"
  }
}
```

#### ตัวอย่างที่ 2: Filter by Amount > 1000
```json
{
  "functionType": "ARRAY_FILTER",
  "functionParams": {
    "jsonField": "transactions",
    "filterField": "amount",
    "filterOperator": ">",
    "filterValue": 1000,
    "selectField": "transactionId"
  }
}
```

#### ตัวอย่างที่ 3: Get 2nd item ที่ตรง condition
```json
{
  "functionType": "ARRAY_FILTER",
  "functionParams": {
    "jsonField": "products",
    "filterField": "category",
    "filterValue": "Electronics",
    "selectIndex": 1,
    "selectField": "productName"
  }
}
```

---

## 🔗 2. CHAIN Function

### ใช้สำหรับ:
- เชื่อม functions หลายตัวเข้าด้วยกัน
- ส่งผลลัพธ์จาก function หนึ่งไปยัง function ถัดไป
- สร้าง transformation pipeline ที่ซับซ้อน

### ตัวอย่าง Use Case:
```
1. Filter Address Type = "HOME"
2. ดึง Street field
3. Substring 0-30 characters
4. เพิ่ม "..." ต่อท้าย (ถ้าจำเป็น)

ผลลัพธ์: "123 Main Street, Downtown D..."
```

### Parameters:

```json
{
  "steps": [
    {
      "type": "ARRAY_FILTER",
      "params": {
        "jsonField": "eAPPDetails.0.Address",
        "filterField": "Type",
        "filterValue": "HOME",
        "selectField": "Street"
      }
    },
    {
      "type": "SUBSTRING",
      "params": {
        "start": 0,
        "length": 30
      }
    },
    {
      "type": "CONCAT",
      "params": {
        "suffix": "..."
      }
    }
  ]
}
```

#### Parameter Details:

| Parameter | ต้องระบุ | คำอธิบาย |
|-----------|---------|----------|
| `steps` | ✅ | Array ของ transformation steps |
| `steps[].type` | ✅ | Function type ของแต่ละ step |
| `steps[].params` | ✅ | Parameters สำหรับ function นั้น |
| `defaultValue` | ❌ | ค่า default ถ้าทุก step ล้มเหลว |

### วิธีทำงาน:

1. **Step 1**: ใช้ข้อมูล JSON ต้นฉบับ
2. **Step 2+**: ใช้ผลลัพธ์จาก step ก่อนหน้า
3. **Output**: ผลลัพธ์สุดท้ายจาก step สุดท้าย

### ตัวอย่างการใช้งาน:

#### ตัวอย่างที่ 1: Filter + Substring
```json
{
  "functionType": "CHAIN",
  "functionParams": {
    "steps": [
      {
        "type": "ARRAY_FILTER",
        "params": {
          "jsonField": "eAPPDetails.0.Address",
          "filterField": "Type",
          "filterValue": "HOME",
          "selectField": "Street"
        }
      },
      {
        "type": "SUBSTRING",
        "params": {
          "start": 0,
          "length": 30
        }
      }
    ]
  }
}
```

#### ตัวอย่างที่ 2: Custom Function + Format
```json
{
  "functionType": "CHAIN",
  "functionParams": {
    "steps": [
      {
        "type": "CUSTOM",
        "params": {
          "functionName": "calculateAge"
        }
      },
      {
        "type": "NUMBER",
        "params": {
          "decimals": 0
        }
      },
      {
        "type": "CONCAT",
        "params": {
          "suffix": " years old"
        }
      }
    ]
  }
}
```

#### ตัวอย่างที่ 3: Config Lookup + Condition
```json
{
  "functionType": "CHAIN",
  "functionParams": {
    "steps": [
      {
        "type": "CONFIG",
        "params": {
          "jsonField": "salutationCode",
          "configKey": "INSURED"
        }
      },
      {
        "type": "CONDITION",
        "params": {
          "operator": "isEmpty",
          "trueValue": "Unknown",
          "falseValue": null
        }
      }
    ]
  }
}
```

---

## 📖 ตัวอย่างแบบเต็ม

### Scenario: ดึง Home Address และตัดให้เหลือ 50 ตัวอักษร

**JSON Data:**
```json
{
  "eAPPDetails": [{
    "Insured": [{
      "FirstName": "John",
      "LastName": "Doe"
    }],
    "Address": [
      {
        "Type": "HOME",
        "Street": "123 Very Long Street Name That Needs To Be Truncated",
        "City": "Bangkok",
        "PostalCode": "10100"
      },
      {
        "Type": "WORK",
        "Street": "456 Office Building",
        "City": "Bangkok",
        "PostalCode": "10110"
      }
    ]
  }]
}
```

**Template Mapping:**
```sql
INSERT INTO soap_template_mappings
(template_id, xml_path, function_type, function_params, description)
VALUES (
  1,
  'S2465.HOME_ADDRESS',
  'CHAIN',
  '{
    "steps": [
      {
        "type": "ARRAY_FILTER",
        "params": {
          "jsonField": "eAPPDetails.0.Address",
          "filterField": "Type",
          "filterValue": "HOME",
          "selectField": "Street"
        }
      },
      {
        "type": "SUBSTRING",
        "params": {
          "start": 0,
          "length": 50
        }
      }
    ]
  }',
  'Get HOME address street, max 50 chars'
);
```

**ผลลัพธ์:**
```
"123 Very Long Street Name That Needs To Be Trunca"
```

---

## 🎨 ใช้งานผ่าน UI

### 1. เลือก Function Type = "Chain - Multiple functions"

### 2. กรอก Parameters:

```json
{
  "steps": [
    {
      "type": "ARRAY_FILTER",
      "params": {
        "jsonField": "eAPPDetails.0.Address",
        "filterField": "Type",
        "filterValue": "HOME",
        "selectField": "Street"
      }
    },
    {
      "type": "SUBSTRING",
      "params": {
        "start": 0,
        "length": 30
      }
    }
  ]
}
```

### 3. กด Save

---

## 🧪 การทดสอบ

### Test ARRAY_FILTER:

```javascript
// Test data
const data = {
  eAPPDetails: [{
    Address: [
      { Type: "HOME", Street: "123 Main St" },
      { Type: "WORK", Street: "456 Office" }
    ]
  }]
}

// Mapping
const mapping = {
  functionType: "ARRAY_FILTER",
  functionParams: {
    jsonField: "eAPPDetails.0.Address",
    filterField: "Type",
    filterValue: "HOME",
    selectField: "Street"
  }
}

// Expected: "123 Main St"
```

### Test CHAIN:

```javascript
// Test data
const data = {
  eAPPDetails: [{
    Address: [
      { Type: "HOME", Street: "123 Very Long Street Name" }
    ]
  }]
}

// Mapping
const mapping = {
  functionType: "CHAIN",
  functionParams: {
    steps: [
      {
        type: "ARRAY_FILTER",
        params: {
          jsonField: "eAPPDetails.0.Address",
          filterField: "Type",
          filterValue: "HOME",
          selectField: "Street"
        }
      },
      {
        type: "SUBSTRING",
        params: { start: 0, length: 10 }
      }
    ]
  }
}

// Expected: "123 Very L"
```

---

## 💡 Tips & Best Practices

### ✅ ควรทำ:
- ใช้ ARRAY_FILTER เมื่อต้องกรอง array และเลือก field
- ใช้ CHAIN เมื่อต้องทำหลายขั้นตอน
- Test ด้วย Execute SOAP ก่อน deploy
- ใส่ description อธิบาย mapping

### ❌ ไม่ควรทำ:
- ห้ามใช้ CHAIN ซ้อน CHAIN (ไม่รองรับ)
- ห้าม filter แล้วไม่ระบุ selectField ถ้าต้องการแค่ field เดียว
- ห้าม hardcode index ถ้าไม่แน่ใจว่ามีข้อมูลพอ

### 🎯 Use Cases:

| Use Case | Function | ตัวอย่าง |
|----------|----------|----------|
| Filter array เดียว | `ARRAY_FILTER` | ดึง HOME address |
| Filter + ตัด string | `CHAIN` | Filter address แล้ว substring |
| Filter + format | `CHAIN` | Filter amount แล้ว format number |
| Custom function + format | `CHAIN` | Calculate age แล้วเพิ่ม " ปี" |
| Multiple filters | `CHAIN` (หลาย ARRAY_FILTER) | Filter address แล้ว filter phone |

---

## 🔍 Troubleshooting

### ปัญหา: ไม่เจอข้อมูลที่ filter

**Solution:**
1. ตรวจสอบ `jsonField` path ถูกต้องหรือไม่
2. ตรวจสอบ `filterField` มีใน array items หรือไม่
3. ตรวจสอบ `filterValue` ตรงกับข้อมูลหรือไม่ (case-sensitive)
4. เพิ่ม `defaultValue` เพื่อให้มีค่า fallback

### ปัญหา: CHAIN ไม่ทำงาน

**Solution:**
1. ตรวจสอบ JSON syntax ของ `steps` ถูกต้องหรือไม่
2. แต่ละ step ต้องมี `type` และ `params`
3. Step 2+ ไม่ต้องระบุ `jsonField` (จะใช้ผลจาก step ก่อนหน้า)

### ปัญหา: Array filter ได้หลาย items

**Solution:**
- ใช้ `selectIndex` เลือก item ที่ต้องการ (0 = แรก, 1 = ที่สอง, ...)
- ถ้าต้องการทั้งหมด ใช้ `ARRAY` function แทน

---

## 📚 เอกสารอ้างอิง

- [DYNAMIC_MAPPING_GUIDE.md](DYNAMIC_MAPPING_GUIDE.md) - Function types ทั้งหมด
- [CUSTOM_FUNCTIONS_COMPLETE.md](CUSTOM_FUNCTIONS_COMPLETE.md) - Custom functions
- [HOW_TO_USE_FUNCTIONS.md](HOW_TO_USE_FUNCTIONS.md) - วิธีใช้งาน functions

---

🎉 **Happy Chaining!**
