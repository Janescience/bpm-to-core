# UI Update Guide - Template & Product Pages

## ✅ สิ่งที่ทำเสร็จแล้ว

1. ✅ **Custom Functions API** - `/api/functions`
2. ✅ **Custom Functions UI** - `/functions`
3. ✅ **Mapping Engine** - รองรับ CUSTOM function type แล้ว
4. ✅ **Template Mappings API** - รองรับ function_type, function_params แล้ว
5. ✅ **Product Mappings API** - รองรับ function_type, function_params แล้ว
6. ✅ **MappingForm Component** - สร้างแล้วที่ `/app/components/MappingForm.js`

---

## 🔄 สิ่งที่ต้องอัพเดต

### Option 1: ใช้ MappingForm Component (แนะนำ)

ผมสร้าง `MappingForm.js` component ไว้แล้ว ซึ่งรองรับทุก function types

**ขั้นตอนการใช้งาน:**

#### 1. อัพเดต `/app/templates/[id]/page.js`

```javascript
// เพิ่ม import
import MappingForm from '../../components/MappingForm'

// แทนที่ Mapping Form section (บรรทัดประมาณ 586-666) ด้วย:
{selectedNode && (
  <MappingForm
    selectedNode={selectedNode}
    existingMapping={mappings.find(m => m.xml_path === selectedNode.path)}
    onSave={(mapping) => {
      const existingIndex = mappings.findIndex(m => m.xml_path === selectedNode.path)
      if (existingIndex >= 0) {
        const updated = [...mappings]
        updated[existingIndex] = mapping
        setMappings(updated)
      } else {
        setMappings([...mappings, mapping])
      }
      setSelectedNode(null)
    }}
    onCancel={() => setSelectedNode(null)}
  />
)}
```

#### 2. อัพเดต `/app/products/[id]/page.js`

เหมือนกับข้อ 1 แต่ใช้กับ product mappings:

```javascript
// เพิ่ม import
import MappingForm from '../../components/MappingForm'

// แทนที่ Override Form section (บรรทัดประมาณ 337-407) ด้วย:
{selectedNode && (
  <MappingForm
    selectedNode={selectedNode}
    existingMapping={productMappings.find(m => m.xml_path === selectedNode.path)}
    onSave={(mapping) => {
      const existingIndex = productMappings.findIndex(m => m.xml_path === selectedNode.path)
      if (existingIndex >= 0) {
        const updated = [...productMappings]
        updated[existingIndex] = mapping
        setProductMappings(updated)
      } else {
        setProductMappings([...productMappings, mapping])
      }
      setSelectedNode(null)
    }}
    onCancel={() => setSelectedNode(null)}
  />
)}
```

---

### Option 2: อัพเดต UI ด้วยตัวเอง

ถ้าต้องการแก้ไข form เดิมแทนที่จะใช้ component:

**เพิ่มฟิลด์เหล่านี้ใน form:**

```javascript
// 1. Function Type Dropdown
<select
  value={functionType}
  onChange={(e) => setFunctionType(e.target.value)}
>
  <option value="DIRECT">Direct</option>
  <option value="STATIC">Static</option>
  <option value="CONDITION">Condition</option>
  <option value="CONDITION_MULTIPLE">Multiple Conditions</option>
  <option value="CONCAT">Concat</option>
  <option value="SUBSTRING">Substring</option>
  <option value="DATE">Date</option>
  <option value="NUMBER">Number</option>
  <option value="CONFIG">Config Lookup</option>
  <option value="PRIORITY">Priority</option>
  <option value="ARRAY">Array</option>
  <option value="EXPRESSION">Expression</option>
  <option value="JSCODE">JS Code</option>
  <option value="CUSTOM">Custom Function</option>
</select>

// 2. Function Parameters (JSON Editor)
<textarea
  value={JSON.stringify(functionParams, null, 2)}
  onChange={(e) => {
    try {
      setFunctionParams(JSON.parse(e.target.value))
    } catch (err) {
      // Invalid JSON
    }
  }}
  placeholder='{}'
  rows={8}
/>

// 3. Description
<input
  type="text"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="Mapping description"
/>

// 4. Is Active Checkbox
<input
  type="checkbox"
  checked={isActive}
  onChange={(e) => setIsActive(e.target.checked)}
/>
```

**State ที่ต้องเพิ่ม:**

```javascript
const [functionType, setFunctionType] = useState('DIRECT')
const [functionParams, setFunctionParams] = useState({})
const [description, setDescription] = useState('')
const [isActive, setIsActive] = useState(true)
```

**อัพเดต handleAddMapping / handleAddOverride:**

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

---

## 📊 ตัวอย่างการใช้งาน Function Types

### 1. DIRECT (เดิม)
```json
{
  "function_type": "DIRECT",
  "json_field": "customer.name",
  "function_params": {}
}
```

### 2. CONFIG (Lookup from database)
```json
{
  "function_type": "CONFIG",
  "function_params": {
    "jsonField": "salutationCode",
    "configKey": "INSURED",
    "fallbackToSource": false
  }
}
```

### 3. CONDITION (If-else)
```json
{
  "function_type": "CONDITION",
  "function_params": {
    "jsonField": "paymentMethod",
    "operator": "==",
    "compareValue": "CREDITCARD",
    "trueValue": "CC",
    "falseValue": "CASH"
  }
}
```

### 4. CONCAT (Join strings)
```json
{
  "function_type": "CONCAT",
  "function_params": {
    "fields": ["firstName", "lastName"],
    "separator": " "
  }
}
```

### 5. CUSTOM (User-defined function)
```json
{
  "function_type": "CUSTOM",
  "function_params": {
    "functionName": "calculateAge",
    "functionParams": {}
  }
}
```

---

## 🧪 ทดสอบระบบ

1. เข้า `/functions` และสร้าง custom function
2. เข้า `/templates/[id]` และสร้าง mapping ด้วย function type ต่างๆ
3. ลอง execute SOAP ผ่าน `/products/[id]` และดู XML output
4. ตรวจสอบว่าทุก function type ทำงานถูกต้อง

---

## 📝 หมายเหตุ

- MappingForm component รองรับทุก function types แล้ว
- มี template สำหรับแต่ละ function type
- มี validation สำหรับ JSON parameters
- รองรับ active/inactive mappings

**ถ้ามีปัญหา:**
- ตรวจสอบว่า database มี columns ใหม่แล้ว (run schema.sql)
- ตรวจสอบ API endpoints รองรับฟิลด์ใหม่แล้ว
- ดู browser console สำหรับ errors
