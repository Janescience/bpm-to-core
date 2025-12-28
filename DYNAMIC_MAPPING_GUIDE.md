# Dynamic Mapping Engine - Complete Guide

## Overview

The Dynamic Mapping Engine is a powerful, extensible system that allows you to configure complex data transformations **without writing or modifying code**. This guide shows you how to use all available transformation functions and create custom mappings for any scenario.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Transformation Functions](#transformation-functions)
3. [Real-World Examples](#real-world-examples)
4. [Configuration Management](#configuration-management)
5. [Custom Functions](#custom-functions)
6. [Migration Guide](#migration-guide)

---

## Core Concepts

### Mapping Structure

Every mapping consists of:

```javascript
{
  xml_path: "POLNBCRTIREC.S2465.LGIVNAME",  // Target XML field
  function_type: "DIRECT",                   // Transformation function
  function_params: {                         // Function-specific parameters
    jsonField: "eAPPDetails.0.Insured.0.FirstName",
    defaultValue: ""
  },
  is_required: true,
  is_active: true
}
```

### Function Types

| Function | Purpose | Complexity |
|----------|---------|------------|
| `DIRECT` | Simple field mapping | ⭐ Easy |
| `STATIC` | Fixed value | ⭐ Easy |
| `CONDITION` | If-then-else logic | ⭐⭐ Medium |
| `CONDITION_MULTIPLE` | Multi-field AND/OR logic | ⭐⭐⭐ Advanced |
| `CONCAT` | Combine multiple fields | ⭐⭐ Medium |
| `SUBSTRING` | Extract part of string | ⭐ Easy |
| `DATE` | Date format conversion | ⭐⭐ Medium |
| `NUMBER` | Number formatting | ⭐⭐ Medium |
| `CONFIG` | Database lookup | ⭐⭐ Medium |
| `PRIORITY` | First non-empty value | ⭐⭐ Medium |
| `ARRAY` | Process arrays | ⭐⭐⭐ Advanced |
| `EXPRESSION` | Custom expression | ⭐⭐⭐ Advanced |
| `JSCODE` | Full JavaScript code | ⭐⭐⭐⭐ Expert |

---

## Transformation Functions

### 1. DIRECT - Simple Field Mapping

**Use Case:** Map JSON field directly to XML field with optional default value.

```javascript
{
  xml_path: "S2465.LGIVNAME",
  function_type: "DIRECT",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.FirstName",
    defaultValue: ""
  }
}
```

**Input:**
```json
{
  "eAPPDetails": [
    { "Insured": [{ "FirstName": "สมชาย" }] }
  ]
}
```

**Output XML:**
```xml
<LGIVNAME>สมชาย</LGIVNAME>
```

---

### 2. STATIC - Fixed Value

**Use Case:** Always use the same value regardless of input.

```javascript
{
  xml_path: "S2465.ADDRTYPE",
  function_type: "STATIC",
  function_params: {
    value: "P"
  }
}
```

**Output XML:**
```xml
<ADDRTYPE>P</ADDRTYPE>
```

---

### 3. CONDITION - Conditional Mapping

**Use Case:** Map different values based on conditions (like if-else).

**Example 1: Gender Mapping**

```javascript
{
  xml_path: "S2465.CLTSEX",
  function_type: "CONDITION",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Gender",
    conditions: [
      { operator: "==", value: "MALE", result: "M" },
      { operator: "==", value: "FEMALE", result: "F" }
    ],
    defaultValue: "U"
  }
}
```

**Example 2: Nationality Mapping**

```javascript
{
  xml_path: "S2465.NATLTY",
  function_type: "CONDITION",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Nationality",
    conditions: [
      { operator: "isEmpty", value: null, result: "THA" },
      { operator: "==", value: "THAI", result: "THA" }
    ],
    defaultValue: "THA"
  }
}
```

**Available Operators:**
- `==`, `===` - Equals
- `!=`, `!==` - Not equals
- `>`, `>=`, `<`, `<=` - Comparison
- `contains` - String contains
- `startsWith` - String starts with
- `endsWith` - String ends with
- `isEmpty` - Is null/undefined/empty
- `isNotEmpty` - Has value
- `in` - Value in array
- `notIn` - Value not in array
- `matches` - Regex match

---

### 4. CONDITION_MULTIPLE - Multi-Field Conditional

**Use Case:** Complex business rules with multiple conditions.

**Example: Payment Plan Mapping**

```javascript
{
  xml_path: "S4014.PAYPLAN",
  function_type: "CONDITION_MULTIPLE",
  function_params: {
    conditions: [
      {
        type: "AND",
        checks: [
          { jsonField: "eAPPDetails.0.Payment.PayMethod", operator: "==", value: "CREDITCARD" },
          { jsonField: "eAPPDetails.0.Payment.PayMode", operator: "==", value: "MONTHLY" }
        ],
        result: "BI12"
      },
      {
        type: "AND",
        checks: [
          { jsonField: "eAPPDetails.0.Payment.PayMethod", operator: "==", value: "CREDITCARD" },
          { jsonField: "eAPPDetails.0.Payment.EtrNumber", operator: "==", value: "YES" }
        ],
        result: "BI01"
      }
    ],
    defaultValue: "D000"
  }
}
```

**Input:**
```json
{
  "eAPPDetails": [{
    "Payment": {
      "PayMethod": "CREDITCARD",
      "PayMode": "MONTHLY",
      "EtrNumber": "NO"
    }
  }]
}
```

**Output:** `BI12`

---

### 5. CONCAT - Concatenate Fields

**Use Case:** Combine multiple fields into one (addresses, full names, etc.).

**Example 1: Thai Address Line 1 (0-30 chars)**

```javascript
{
  xml_path: "S2465.CLTADDR01",
  function_type: "CONCAT",
  function_params: {
    fields: [
      { jsonField: "eAPPDetails.0.Address.0.PlotNumber" },
      { jsonField: "eAPPDetails.0.Address.0.BuildingName" },
      { jsonField: "eAPPDetails.0.Address.0.MooNumber", prefix: "ม." },
      { jsonField: "eAPPDetails.0.Address.0.LaneSoi", prefix: "ซอย " },
      { jsonField: "eAPPDetails.0.Address.0.Road", prefix: "ถนน " }
    ],
    separator: " ",
    startIndex: 0,
    maxLength: 30
  }
}
```

**Input:**
```json
{
  "eAPPDetails": [{
    "Address": [{
      "PlotNumber": "123/45",
      "BuildingName": "อาคารสยามทาวเวอร์",
      "MooNumber": "7",
      "LaneSoi": "สุขุมวิท 21",
      "Road": "สุขุมวิท"
    }]
  }]
}
```

**Output:**
```xml
<CLTADDR01>123/45 อาคารสยามทาวเวอร์ ม.7 ซอย </CLTADDR01>
```

**Example 2: Address Line 2 (30-60 chars)**

```javascript
{
  xml_path: "S2465.CLTADDR02",
  function_type: "CONCAT",
  function_params: {
    fields: [
      { jsonField: "eAPPDetails.0.Address.0.PlotNumber" },
      { jsonField: "eAPPDetails.0.Address.0.BuildingName" },
      { jsonField: "eAPPDetails.0.Address.0.MooNumber", prefix: "ม." },
      { jsonField: "eAPPDetails.0.Address.0.LaneSoi", prefix: "ซอย " },
      { jsonField: "eAPPDetails.0.Address.0.Road", prefix: "ถนน " }
    ],
    separator: " ",
    startIndex: 30,
    maxLength: 30
  }
}
```

**Example 3: District with Prefix**

```javascript
{
  xml_path: "S2465.CLTADDR04",
  function_type: "CONCAT",
  function_params: {
    fields: [
      {
        jsonField: "eAPPDetails.0.Address.0.DistrictDesc",
        prefix: "เขต/อำเภอ ",
        replace: {
          "อ.": "",
          "อำเภอ": "",
          "เขต": ""
        }
      }
    ],
    separator: "",
    maxLength: 30
  }
}
```

---

### 6. SUBSTRING - Extract Substring

**Use Case:** Extract part of a string (campaign codes, etc.).

```javascript
{
  xml_path: "S4014.CAMPAIGN",
  function_type: "SUBSTRING",
  function_params: {
    jsonField: "eAPPDetails.0.CampaignCode",
    start: 0,
    length: 6
  }
}
```

**Input:** `"NEWYEAR2025PROMO"`
**Output:** `"NEWYEA"`

---

### 7. DATE - Date Format Conversion

**Use Case:** Convert dates to AS400 format (CCYY/MM/DD).

**Example 1: Birth Date Year**

```javascript
{
  xml_path: "S2465.CLTDOBX.CCYY",
  function_type: "DATE",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Dob",
    format: "CCYY",
    defaultValue: "9999"
  }
}
```

**Example 2: Birth Date Month**

```javascript
{
  xml_path: "S2465.CLTDOBX.MM",
  function_type: "DATE",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Dob",
    format: "MM",
    defaultValue: "99"
  }
}
```

**Example 3: Birth Date Day**

```javascript
{
  xml_path: "S2465.CLTDOBX.DD",
  function_type: "DATE",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Dob",
    format: "DD",
    defaultValue: "99"
  }
}
```

**Input:** `"1990-05-15"`
**Output:**
- CCYY: `"1990"`
- MM: `"05"`
- DD: `"15"`

---

### 8. NUMBER - Number Formatting

**Use Case:** Format numbers with precision, padding, multiplication.

**Example 1: Weight with 3 Decimals**

```javascript
{
  xml_path: "PERSONINF.ZWGHT",
  function_type: "NUMBER",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Weight",
    decimals: 3,
    defaultValue: "0.000"
  }
}
```

**Example 2: Rider SA with Zero Padding**

```javascript
{
  xml_path: "RIDERPLAN.RDRANT1X",
  function_type: "NUMBER",
  function_params: {
    jsonField: "eAPPDetails.0.Riders.0.RiderSA",
    padLeft: 5,
    decimals: 0,
    defaultValue: "00000"
  }
}
```

**Example 3: Discount as Negative Premium**

```javascript
{
  xml_path: "RSKDATA.ADDPREM01X",
  function_type: "NUMBER",
  function_params: {
    jsonField: "eAPPDetails.0.Product.DiscountAmount",
    multiply: -1,
    decimals: 2,
    defaultValue: "0.00"
  }
}
```

**Input:** `50.5`
**Output:** `"-50.50"`

---

### 9. CONFIG - Database Lookup

**Use Case:** Lookup codes from configuration tables.

**Example 1: Salutation Code**

```javascript
{
  xml_path: "S2465.SALUTL",
  function_type: "CONFIG",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.Salutation",
    configKey: "INSURED",
    fallbackToSource: true,
    defaultValue: "103"
  }
}
```

**Configuration Table (`bpm_soap_bocaller_parameters`):**
| bpm_key | output | input |
|---------|--------|-------|
| INSURED | นาย | 101 |
| INSURED | นาง | 102 |
| INSURED | นางสาว | 103 |

**Input:** `"นาย"`
**Output:** `"101"`

**If input is numeric (e.g., "102"):** Returns `"102"` (fallbackToSource)

**Example 2: Marital Status**

```javascript
{
  xml_path: "S2465.MARRYD",
  function_type: "CONFIG",
  function_params: {
    jsonField: "eAPPDetails.0.Insured.0.MariStatus",
    configKey: "MARISTATUS",
    fallbackToSource: false,
    defaultValue: ""
  }
}
```

---

### 10. PRIORITY - First Non-Empty Value

**Use Case:** Try multiple fields, use first available.

**Example: Citizen ID or Passport**

```javascript
{
  xml_path: "S2465.SECUITYNO",
  function_type: "PRIORITY",
  function_params: {
    fields: [
      "eAPPDetails.0.Insured.0.CitizenID",
      "eAPPDetails.0.Insured.0.PassportNo"
    ],
    defaultValue: ""
  }
}
```

**Input 1:**
```json
{
  "eAPPDetails": [{
    "Insured": [{
      "CitizenID": "1234567890123",
      "PassportNo": ""
    }]
  }]
}
```
**Output:** `"1234567890123"`

**Input 2:**
```json
{
  "eAPPDetails": [{
    "Insured": [{
      "CitizenID": "",
      "PassportNo": "AB1234567"
    }]
  }]
}
```
**Output:** `"AB1234567"`

---

### 11. ARRAY - Process Arrays

**Use Case:** Map array elements (riders, beneficiaries, etc.).

**Example: Riders Mapping (Up to 10 Riders)**

```javascript
{
  xml_path: "RIDERPLAN",
  function_type: "ARRAY",
  function_params: {
    jsonField: "eAPPDetails.0.Riders",
    filter: null,
    sort: { field: "RiderCode", order: "asc" },
    maxItems: 10,
    map: [
      {
        targetField: "RIDER{index}X",
        sourceField: "RiderCode",
        transform: "trim"
      },
      {
        targetField: "RDRANT{index}X",
        sourceField: "RiderSA",
        format: { padLeft: 5, padChar: "0" }
      }
    ]
  }
}
```

**Input:**
```json
{
  "eAPPDetails": [{
    "Riders": [
      { "RiderCode": "H5", "RiderSA": 1000 },
      { "RiderCode": "H6", "RiderSA": 2000 }
    ]
  }]
}
```

**Output:** (Creates multiple XML fields)
```xml
<RIDER1X>H5</RIDER1X>
<RDRANT1X>01000</RDRANT1X>
<RIDER2X>H6</RIDER2X>
<RDRANT2X>02000</RDRANT2X>
```

**Example: Beneficiaries (Filter & Sort)**

```javascript
{
  xml_path: "POLDATA",
  function_type: "ARRAY",
  function_params: {
    jsonField: "eAPPDetails.0.Beneficiary",
    filter: { field: "BenefType", operator: "==", value: "PRIMARY" },
    sort: { field: "CustomerID", order: "asc" },
    maxItems: 3,
    map: [
      {
        targetField: "ALINE{index}X",
        sourceField: "FirstName"
      }
    ]
  }
}
```

---

### 12. EXPRESSION - Custom Expression

**Use Case:** Simple calculations and string operations.

**Example: Full Name**

```javascript
{
  xml_path: "BENEFICIARY_NAME",
  function_type: "EXPRESSION",
  function_params: {
    expression: "firstName + ' ' + lastName",
    variables: {
      firstName: "eAPPDetails.0.Insured.0.FirstName",
      lastName: "eAPPDetails.0.Insured.0.LastName"
    }
  }
}
```

**Example: BMI Calculation**

```javascript
{
  xml_path: "PERSONINF.ZBMIVAL",
  function_type: "EXPRESSION",
  function_params: {
    expression: "(weight / ((height / 100) * (height / 100))).toFixed(2)",
    variables: {
      weight: "eAPPDetails.0.Insured.0.Weight",
      height: "eAPPDetails.0.Insured.0.Height"
    }
  }
}
```

---

### 13. JSCODE - Full JavaScript Code

**Use Case:** Complex business logic that can't be expressed with other functions.

**Example 1: Payment Plan Logic**

```javascript
{
  xml_path: "S4014.PAYPLAN",
  function_type: "JSCODE",
  function_params: {
    code: `
      const payment = getNestedValue(data, 'eAPPDetails.0.Payment');

      if (!payment) return 'D000';

      if (payment.PayMethod === 'CREDITCARD') {
        if (payment.PayMode === 'MONTHLY') {
          return 'BI12';
        }

        if ((payment.PayMode === 'ANNUAL' || payment.PayMode === 'YEARLY') &&
            payment.EtrNumber === 'YES') {
          return 'BI01';
        }
      }

      return 'D000';
    `,
    helpers: ["getNestedValue", "isEmpty"]
  }
}
```

**Example 2: Occupation Class with SW Partner Logic**

```javascript
{
  xml_path: "RSKDATA.SCLASI1X",
  function_type: "JSCODE",
  function_params: {
    code: `
      const occClass = getNestedValue(data, 'eAPPDetails.0.Occupation.0.OccClass');
      const partner = getNestedValue(data, 'eAPPDetails.0.Partner');

      if (isEmpty(occClass)) return '00';

      // Convert to string and pad left
      let result = String(occClass).padStart(2, '0');

      // Special SW partner logic
      if (partner === 'SW') {
        const validClasses = ['01', '02', '03', '04'];
        if (!validClasses.includes(result)) {
          return '04'; // Default to 04 for invalid
        }
      }

      return result;
    `,
    helpers: ["getNestedValue", "isEmpty"]
  }
}
```

**Example 3: Corporate Payer Conditional Block**

```javascript
{
  xml_path: "S2480.ACTION",
  function_type: "JSCODE",
  function_params: {
    code: `
      const ownerType = getNestedValue(data, 'eAPPDetails.0.Payer.0.OwnerType');

      if (ownerType === 'C') {
        // Corporate payer
        return 'B';
      }

      return '';
    `,
    helpers: ["getNestedValue"]
  }
}
```

---

## Real-World Examples

### Complete Address Mapping (Thai Format)

```javascript
// Address Line 1 (0-30)
{
  xml_path: "S2465.CLTADDR01",
  function_type: "CONCAT",
  function_params: {
    fields: [
      { jsonField: "eAPPDetails.0.Address.0.PlotNumber" },
      { jsonField: "eAPPDetails.0.Address.0.BuildingName" },
      { jsonField: "eAPPDetails.0.Address.0.MooNumber", prefix: "ม." },
      { jsonField: "eAPPDetails.0.Address.0.LaneSoi", prefix: "ซอย " },
      { jsonField: "eAPPDetails.0.Address.0.Road", prefix: "ถนน " }
    ],
    separator: " ",
    startIndex: 0,
    maxLength: 30
  }
}

// Address Line 2 (30-60)
{
  xml_path: "S2465.CLTADDR02",
  function_type: "CONCAT",
  function_params: {
    fields: [
      { jsonField: "eAPPDetails.0.Address.0.PlotNumber" },
      { jsonField: "eAPPDetails.0.Address.0.BuildingName" },
      { jsonField: "eAPPDetails.0.Address.0.MooNumber", prefix: "ม." },
      { jsonField: "eAPPDetails.0.Address.0.LaneSoi", prefix: "ซอย " },
      { jsonField: "eAPPDetails.0.Address.0.Road", prefix: "ถนน " }
    ],
    separator: " ",
    startIndex: 30,
    maxLength: 30
  }
}

// Sub-District (with prefix removal)
{
  xml_path: "S2465.CLTADDR03",
  function_type: "CONCAT",
  function_params: {
    fields: [
      {
        jsonField: "eAPPDetails.0.Address.0.SubDistrictDesc",
        prefix: "แขวง/ตำบล ",
        replace: {
          "ต.": "",
          "ตำบล": "",
          "แขวง": ""
        }
      }
    ],
    maxLength: 30
  }
}

// District
{
  xml_path: "S2465.CLTADDR04",
  function_type: "CONCAT",
  function_params: {
    fields: [
      {
        jsonField: "eAPPDetails.0.Address.0.DistrictDesc",
        prefix: "เขต/อำเภอ ",
        replace: {
          "อ.": "",
          "อำเภอ": "",
          "เขต": ""
        }
      }
    ],
    maxLength: 30
  }
}

// Province (special Bangkok handling)
{
  xml_path: "S2465.CLTADDR05",
  function_type: "CONDITION",
  function_params: {
    jsonField: "eAPPDetails.0.Address.0.ProvinceName",
    conditions: [
      { operator: "==", value: "กรุงเทพมหานคร", result: "กรุงเทพมหานคร" },
      { operator: "==", value: "Bangkok", result: "กรุงเทพมหานคร" }
    ],
    defaultValue: ""  // Will be prefixed in next step
  }
}
```

### Travel Product Date Fields (Conditional by Product Type)

```javascript
// Effective Date (different source for Travel vs Others)
{
  xml_path: "S4014.CCDATE.CCYY",
  function_type: "JSCODE",
  function_params: {
    code: `
      const productType = getNestedValue(data, 'eAPPDetails.0.Product.ProductType');
      let dateField;

      if (productType === 'TRAVEL') {
        dateField = getNestedValue(data, 'eAPPDetails.0.DepartureDate');
      } else if (productType === 'TISCO') {
        dateField = getNestedValue(data, 'eAPPDetails.0.EffectiveDate');
      } else {
        dateField = getNestedValue(data, 'eAPPDetails.0.Payment.PayReceiveDate');
      }

      if (!dateField) return '9999';

      const date = new Date(dateField);
      return date.getFullYear().toString();
    `,
    helpers: ["getNestedValue"]
  }
}
```

### Beneficiary with TISCO Percentage Display

```javascript
{
  xml_path: "POLDATA.ALINE01X",
  function_type: "JSCODE",
  function_params: {
    code: `
      const benef = getNestedValue(data, 'eAPPDetails.0.Beneficiary.0');
      const partner = getNestedValue(data, 'eAPPDetails.0.Partner');

      if (!benef) return '';

      let name = '';

      // Add salutation (lookup from config would be better)
      if (benef.Salutation) {
        name += benef.Salutation + ' ';
      }

      name += (benef.FirstName || '') + ' ' + (benef.LastName || '');

      // Add percentage for TISCO only
      if (partner === 'TISCO' && benef.Percent) {
        name += ' ' + benef.Percent + '%';
      }

      return name.trim();
    `,
    helpers: ["getNestedValue"]
  }
}
```

---

## Configuration Management

### Adding Configuration Values via UI

```javascript
// API: POST /api/config
{
  bpm_key: "INSURED",
  output: "ด.ช.",
  input: "104",
  description: "Boy (เด็กชาย)"
}
```

### Batch Import Configuration

```javascript
// API: POST /api/config/batch
{
  configKey: "OCCUPATION",
  mappings: [
    { output: "ข้าราชการ", input: "0001", description: "Government Officer" },
    { output: "พนักงานบริษัท", input: "0002", description: "Company Employee" },
    { output: "ธุรกิจส่วนตัว", input: "0003", description: "Business Owner" }
  ]
}
```

### Query Configuration

```sql
-- Get all salutation mappings
SELECT * FROM bpm_soap_bocaller_parameters WHERE bpm_key = 'INSURED';

-- Get all config keys
SELECT DISTINCT bpm_key, COUNT(*) FROM bpm_soap_bocaller_parameters GROUP BY bpm_key;

-- Find mappings using a specific config
SELECT * FROM soap_template_mappings
WHERE function_params->>'configKey' = 'INSURED';
```

---

## Custom Functions

### Creating a Custom Function

```javascript
// Add to soap_custom_functions table
{
  function_name: "getAgentCommissionType",
  description: "Get commission type based on agent code",
  code: `
    const agentCode = getNestedValue(data, 'eAPPDetails.0.Agent.0.AgentName2');

    if (isEmpty(agentCode)) return '';

    // Lookup from BpmAgentConfig table
    if (context.agentConfigLookup) {
      const commType = await context.agentConfigLookup(agentCode);
      if (commType) return commType;
    }

    return '';
  `,
  parameters: []
}
```

### Using Custom Function

```javascript
{
  xml_path: "S4014.ZCOMTYP",
  function_type: "JSCODE",
  function_params: {
    code: `
      // Load custom function from database
      const customFunc = context.loadCustomFunction('getAgentCommissionType');
      return await customFunc(data, helpers, context);
    `,
    helpers: ["getNestedValue", "isEmpty"]
  }
}
```

---

## Migration Guide

### Step 1: Apply Database Schema

```bash
psql -U your_user -d your_database -f db/schema_v2_dynamic_mapping.sql
```

### Step 2: Convert Existing Mappings

```sql
-- Add function_type and function_params to existing mappings
UPDATE soap_template_mappings
SET
  function_type = 'DIRECT',
  function_params = jsonb_build_object(
    'jsonField', json_field,
    'defaultValue', default_value
  )
WHERE function_type IS NULL;
```

### Step 3: Update API Endpoint

Change from `/api/soap/execute` to `/api/soap/execute-v2`

```javascript
// Old
const response = await fetch('/api/soap/execute', {
  method: 'POST',
  body: JSON.stringify({ product_id, json_data })
});

// New (with dynamic mapping engine)
const response = await fetch('/api/soap/execute-v2', {
  method: 'POST',
  body: JSON.stringify({ product_id, json_data })
});
```

### Step 4: Test with Sample Data

```bash
# Use existing Execute SOAP modal in the UI
# Select product
# Upload JSON file
# Click "Execute SOAP Request"
# Verify XML output matches expected format
```

---

## Advanced Tips

### 1. Debugging Mappings

Add `console.log` in JSCODE functions:

```javascript
{
  code: `
    console.log('Input data:', data);
    const value = getNestedValue(data, 'eAPPDetails.0.Product.Sa');
    console.log('Extracted value:', value);
    return value;
  `
}
```

View logs in server console.

### 2. Performance Optimization

- Use `DIRECT` instead of `JSCODE` when possible
- Cache config lookups (already implemented)
- Avoid complex expressions in loops

### 3. Testing Complex Mappings

Create test mappings in product-level overrides before adding to template:

```sql
-- Test in product first
INSERT INTO soap_product_mappings (product_id, xml_path, function_type, function_params)
VALUES (
  123,
  'S2465.TEST_FIELD',
  'JSCODE',
  '{"code": "return ''TEST'';", "helpers": []}'
);

-- Once verified, move to template
INSERT INTO soap_template_mappings (template_id, xml_path, function_type, function_params)
SELECT template_id, xml_path, function_type, function_params
FROM soap_product_mappings
WHERE product_id = 123 AND xml_path = 'S2465.TEST_FIELD';
```

### 4. Version Control for Mappings

Export mappings as JSON:

```sql
-- Export template mappings
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT xml_path, function_type, function_params, default_value, is_required
    FROM soap_template_mappings
    WHERE template_id = 1
  ) t
) TO '/path/to/template_1_mappings.json';
```

Import:

```javascript
// API: POST /api/mappings/import
const mappings = JSON.parse(fs.readFileSync('template_1_mappings.json'));
```

---

## Summary

The Dynamic Mapping Engine provides:

✅ **Zero Code Changes** - All transformations configurable via database
✅ **Comprehensive Functions** - 13 built-in transformation types
✅ **Extensibility** - Custom JSCODE for any scenario
✅ **Type Safety** - Schema validation and error handling
✅ **Performance** - Config caching and optimized execution
✅ **Maintainability** - Database-driven configuration

You can now handle **any mapping scenario** from MAPPING_DOCUMENTATION.md without modifying code!

---

## Quick Reference

| Need to... | Use Function |
|-----------|-------------|
| Map field 1:1 | `DIRECT` |
| Fixed value | `STATIC` |
| If-then-else | `CONDITION` |
| Multiple conditions | `CONDITION_MULTIPLE` |
| Combine fields | `CONCAT` |
| Split string | `SUBSTRING` |
| Format date | `DATE` |
| Format number | `NUMBER` |
| Lookup code | `CONFIG` |
| Fallback values | `PRIORITY` |
| Loop through array | `ARRAY` |
| Simple calculation | `EXPRESSION` |
| Complex logic | `JSCODE` |

---

**Questions?** Check [MAPPING_DOCUMENTATION.md](./MAPPING_DOCUMENTATION.md) for specific field requirements.
