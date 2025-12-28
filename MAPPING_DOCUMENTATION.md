# BPM to CORE SOAP Mapping Documentation

## Overview
เอกสารนี้อธิบายการ mapping ข้อมูลจาก JSON (BPM) ไปยัง XML SOAP (AS400 CORE System) สำหรับระบบประกันภัย Generali Thailand

**ไฟล์อ้างอิง**: `BPMServiceV2.java`, `DynamicXmlMapper.java`, `SoapMappingService.java`

---

## 1. Architecture Overview

### 1.1 Flow การทำงาน
```
JSON Input (BPM) 
    → Parse & Validate
    → Dynamic Mapping (config-based หรือ javaCode)
    → XML SOAP Request
    → AS400 CORE System
    → SOAP Response
    → Policy Pack System (optional)
```

### 1.2 Components หลัก
- **DynamicXmlMapper**: รองรับ dynamic mapping ด้วย Groovy engine
- **SoapMappingService**: จัดการ mapping configuration และ execution
- **BPMServiceV2**: Main service สำหรับ process policy data
- **SoapBocallerParameters**: Configuration parameters จาก database

---

## 2. Mapping Configuration Types

### 2.1 Static Mapping
การ map โดยตรงจาก source ไปยัง destination

| JSON Source Path | XML Destination | Data Type | Description |
|-----------------|----------------|-----------|-------------|
| `eAPPDetails.0.PolicyNumber` | `POLNBCRTI_REC.S4014.CHDRNUM` | String | Policy Number |
| `eAPPDetails.0.ApplicationNumber` | `POLNBCRTI_REC.S4014.MPLNUM` | String | Application/Master Policy Number |
| `eAPPDetails.0.ContractType` | `POLNBCRTI_REC.S4033.CNTTYPE` | String | Contract Type (AHI, AGI, DM, EPA, etc.) |

### 2.2 Function-based Mapping
การ map พร้อม apply functions (ดู `DynamicXmlMapper.applyFunction`)

| Function | Format | Example | Description |
|----------|--------|---------|-------------|
| `CONDITION` | `CONDITION:source:checkValue:trueValue:falseValue` | `CONDITION:gender:M:01:02` | Conditional mapping |
| `CONDITION_MULTIPLE` | `CONDITION_MULTIPLE:source:VAL1:RES1:VAL2:RES2:DEFAULT` | `CONDITION_MULTIPLE:gender:Male:M:Female:F:?` | Multiple condition switch |
| `CONCAT` | `CONCAT:separator:field1,field2,field3` | `CONCAT: :firstName,lastName` | Concatenate fields |
| `DATE` | `DATE:source:inputFormat:outputFormat` | `DATE:dob:YYYY-MM-DD:YYYYMMDD` | Date format conversion |
| `NUMBER` | `NUMBER:source:decimalPlaces` | `NUMBER:amount:2` | Number formatting |
| `CONFIG` | `CONFIG:configKey:value` | `CONFIG:OCCUPATION:01` | Lookup from config table |
| `SUBSTRING` | `SUBSTRING:source:start:length` | `SUBSTRING:address:0:30` | Extract substring |
| `DEFAULT` | `DEFAULT:source:defaultValue` | `DEFAULT:phone:000-000-0000` | Set default if empty |

### 2.3 JavaCode-based Mapping (Dynamic)
การใช้ Groovy engine รัน Java code แบบ dynamic

**Example 1: Address Concatenation with Length Limit**
```java
// Mapping Configuration
{
  "source": ["eAPPDetails.0.Address.0.PlotNumber", "eAPPDetails.0.Address.0.MooNumber", ...],
  "destination": "POLNBCRTI_REC.S2465.CLTADDR01",
  "javaCode": "String result = String.join(\" \",\n    String.valueOf(sourceData.get(\"eAPPDetails.0.Address.0.PlotNumber\")),\n    String.valueOf(sourceData.get(\"eAPPDetails.0.Address.0.MooNumber\"))\n).replaceAll(\"null\", \"\").trim();\nreturn result.substring(0, Math.min(30, result.length()));"
}
```

**Example 2: Occupation Class Validation**
```java
{
  "source": ["eAPPDetails.0.Occupation.0.OccClass"],
  "destination": "POLNBCRTI_REC.ADDITIONAL_FIELDS.RSK_DATA.SCLASI1X",
  "javaCode": "def occClassValue = getNestedValue(sourceData, \"eAPPDetails.0.Occupation.0.OccClass\");\nif (StringUtils.isNotEmpty(occClassValue)) {\n    def occClassStr = String.valueOf(occClassValue).strip();\n    if (StringUtils.isNumeric(occClassStr)) {\n        return StringUtils.leftPad(occClassStr, 2, '0');\n    }\n    return \"00\";\n}\nreturn \"00\";"
}
```

---

## 3. Detailed Field Mapping Tables

### 3.1 Policy Header (S4014)

| JSON Field | XML Field | Mapping Rule | Default | Notes |
|-----------|-----------|--------------|---------|-------|
| `eAPPDetails.0.PolicyNumber` | `S4014.CHDRNUM` | Direct | - | Policy Number |
| `eAPPDetails.0.ApplicationNumber` | `S4014.MPLNUM` | Direct | - | Master Policy/Application Number |
| `eAPPDetails.0.ReceiptDate` | `S4014.CRDATE` | DATE:YYYY-MM-DD:YYYYMMDD | - | Receipt Date |
| `eAPPDetails.0.EffectiveDate` | `S4014.CCDATE` | DATE:YYYY-MM-DD:YYYYMMDD | - | Effective Date |
| `eAPPDetails.0.Channel` | `S4014.AGNTNUM` | CONFIG:CHANNEL | - | Sales Channel Code |

### 3.2 Client Information (S2465)

| JSON Field | XML Field | Mapping Rule | Max Length | Validation |
|-----------|-----------|--------------|-----------|------------|
| `eAPPDetails.0.PolicyHolder.0.FirstName` | `S2465.LGIVNAME` | Direct | 30 | Required |
| `eAPPDetails.0.PolicyHolder.0.LastName` | `S2465.LSURNAME` | Direct | 40 | Required |
| `eAPPDetails.0.PolicyHolder.0.TitleName` | `S2465.SALUTL` | CONFIG:TITLE | 4 | Lookup |
| `eAPPDetails.0.PolicyHolder.0.NationalID` | `S2465.CLNTNUM` | Direct | 13 | Format: 13 digits |
| `eAPPDetails.0.PolicyHolder.0.DateOfBirth` | `S2465.CLTDOBX` | DATE:YYYY-MM-DD:YYYYMMDD | 8 | Format: CCYYMMDD |
| `eAPPDetails.0.PolicyHolder.0.Gender` | `S2465.CLTSEX` | CONDITION:M:M:F | 1 | M or F |
| `eAPPDetails.0.Address.0.*` | `S2465.CLTADDR01-05` | JavaCode (concat) | 30 each | 5 lines max |
| `eAPPDetails.0.Address.0.PostalCode` | `S2465.CLTPCODE` | Direct | 5 | Required |
| `eAPPDetails.0.PolicyHolder.0.Email` | `S2465.CLTMAIL` | Direct | 60 | Email format |
| `eAPPDetails.0.PolicyHolder.0.MobilePhone` | `S2465.CLTPHONE01` | Direct | 20 | Phone format |

**Address Mapping Logic:**
```javascript
// Concatenate: PlotNumber + MooNumber + BuildingName + Lane + Road
// Remove "null" strings, trim, and limit to 30 chars per line
// Split across CLTADDR01-05 (5 lines × 30 chars)
```

### 3.3 Coverage Information (S8408)

| JSON Field | XML Field | Mapping Rule | Notes |
|-----------|-----------|--------------|-------|
| `eAPPDetails.0.EffectiveDate` | `S8408.EFFDATE` | DATE:YYYY-MM-DD:YYYYMMDD | Coverage effective date |
| `eAPPDetails.0.PlanCode` | `S8408.COVERAGE` | CONFIG:PLAN_CODE | Main plan code |
| `eAPPDetails.0.SumInsured` | `S8408.SINSTAMT01` | NUMBER:0 | Sum insured amount |
| `eAPPDetails.0.Premium` | `S8408.INSTPREM` | NUMBER:2 | Premium amount |

### 3.4 Product-Specific Mappings

#### 3.4.1 Health Products (AHI, DM)

| JSON Field | XML Field | Condition | Mapping |
|-----------|-----------|-----------|---------|
| `eAPPDetails.0.Occupation.0.OccClass` | `ADDITIONAL_FIELDS.RSK_DATA.SCLASI1X` | If numeric | Left pad to 2 digits |
| `eAPPDetails.0.Occupation.0.OccCode` | `ADDITIONAL_FIELDS.RSK_DATA.SOCCUPX` | - | Direct |
| `eAPPDetails.0.Height` | `ADDITIONAL_FIELDS.RSK_DATA.SHGHTX` | - | Height in cm |
| `eAPPDetails.0.Weight` | `ADDITIONAL_FIELDS.RSK_DATA.SWGHTX` | - | Weight in kg |
| `eAPPDetails.0.BMI` | `ADDITIONAL_FIELDS.RSK_DATA.SBMIX` | Calculated | BMI value |

**OPD Coverage for DM Products (AHSAHDT1-6)**:
```java
// Extract H5 OPD rider value from riders list
if (planCode in ["AHSAHDT1", "AHSAHDT2", "AHSAHDT3", "AHSAHDT4", "AHSAHDT5", "AHSAHDT6"]) {
    List<String> getOPD = riders.stream()
        .filter(s -> s.startsWith("H5"))
        .map(s -> s.split("-")[1])
        .collect(Collectors.toList());
    
    dailyEPolicy.setH5_OPDV(getOPD.isEmpty() ? "" : getOPD.get(0));
} else {
    dailyEPolicy.setH5_OPDV(planMapping.getH5_OPDV());
}
```

**Occupation Class Validation (SW Partner)**:
```java
String occClass = "00";
if (StringUtils.isNumeric(occupation.getOccClass().strip())) {
    occClass = StringUtils.leftPad(occupation.getOccClass().strip(), 2, '0');
}
// SW partner special rule: if not in [1,2,3,4] → force to "04"
if ("SW".equalsIgnoreCase(partnerCode) && !["1","2","3","4"].contains(occupation.getOccClass().strip())) {
    occClass = "04";
}
```

### 3.4.2 PA Products (EPA, KKPA)

| JSON Field | XML Field | Special Logic |
|-----------|-----------|---------------|
| `eAPPDetails.0.Beneficiary[].Percentage` | `ADDITIONAL_FIELDS.PERSONINF.SBENPERX` | Must sum to 100% |
| `eAPPDetails.0.Beneficiary[].Relationship` | `ADDITIONAL_FIELDS.PERSONINF.SRELATION` | CONFIG:RELATIONSHIP |

**Print Card Logic**:
```java
if ("AGI".equalsIgnoreCase(contractType) || "ITS".equalsIgnoreCase(contractType)) {
    printCard = "N";  // No card for AGI/ITS
} else {
    printCard = "Y";  // Print card for other products
}
```

#### 3.4.3 Travel Products (ETRVL)

| JSON Field | XML Field | Validation |
|-----------|-----------|------------|
| `eAPPDetails.0.TravelDetails.0.Destination` | `ADDITIONAL_FIELDS.NEWTRAVEL.SDESTCX` | Required |
| `eAPPDetails.0.TravelDetails.0.DateFrom` | `ADDITIONAL_FIELDS.NEWTRAVEL.DATEFRM.SYEARX` | Format: CCYY/MM/DD split |
| `eAPPDetails.0.TravelDetails.0.DateTo` | `ADDITIONAL_FIELDS.NEWTRAVEL.DATETO.SYEARX` | Format: CCYY/MM/DD split |
| `eAPPDetails.0.TravelDetails.0.TripType` | `ADDITIONAL_FIELDS.NEWTRAVEL.STRIPTYPE` | Single/Multiple |

---

## 4. Configuration Parameters (SoapBocallerParameters)

### 4.1 Parameter Types

| BPM Key | System Type | Output Example | Input (AS400 Code) | Description |
|---------|------------|----------------|-------------------|-------------|
| `TITLE` | NL | `MR` | `01` | Title/Salutation |
| `TITLE` | NL | `MRS` | `02` | Title/Salutation |
| `TITLE` | NL | `MISS` | `03` | Title/Salutation |
| `GENDER` | NL | `M` | `M` | Male |
| `GENDER` | NL | `F` | `F` | Female |
| `OCCUPATION` | NL | `01` | `01` | Occupation Class 1 |
| `OCCUPATION` | NL | `02` | `02` | Occupation Class 2 |
| `OCCUPATION` | NL | `03` | `03` | Occupation Class 3 |
| `OCCUPATION` | NL | `04` | `04` | Occupation Class 4 |
| `RELATIONSHIP` | NL | `FATHER` | `01` | Father |
| `RELATIONSHIP` | NL | `MOTHER` | `02` | Mother |
| `RELATIONSHIP` | NL | `SPOUSE` | `03` | Spouse |
| `RELATIONSHIP` | NL | `CHILD` | `04` | Child |
| `CHANNEL` | NL | `WEB` | `9999` | Web Channel |
| `CHANNEL` | NL | `AGENT` | `1234` | Agent Channel |

### 4.2 Usage in Mapping
```java
// ใน DynamicXmlMapper.applyFunction()
case "CONFIG":
    String key = parts[2]; // BPM Key
    return getParameter(key, sourceValue.toString());

// ตัวอย่าง
// Input: "MR" → Query: findFirstByBpmKeyAndOutputAndSystemType("TITLE", "MR", "NL")
// Output: "01"
```

---

## 5. Conditional Mapping Rules

### 5.1 Product-based Conditions

```java
// ใน BPMServiceV2.java

// 1. Print Card Logic
if ("AGI".equalsIgnoreCase(contractType) || "KKPA".equalsIgnoreCase(contractType)) {
    dailyEPolicy.setPrintCard("N");
} else {
    dailyEPolicy.setPrintCard("Y");
}

// 2. OPD Coverage Logic (for Health products)
if (planMapping != null) {
    if (planMapping.getH5_OPDV() != null && !planMapping.getH5_OPDV().isEmpty()) {
        List<String> getOPD = Arrays.asList(planMapping.getH5_OPDV().split(","));
        if (getOPD.size() > 0) {
            dailyEPolicy.setH5_OPDV(getOPD.get(0));
        } else {
            dailyEPolicy.setH5_OPDV("");
        }
    } else {
        dailyEPolicy.setH5_OPDV("");
    }
} else {
    dailyEPolicy.setH5_OPDV("");
}
```

### 5.2 Validation Rules

| Field | Validation Rule | Error Handling |
|-------|----------------|----------------|
| National ID | 13 digits, numeric only | Return error to BPM |
| Email | Valid email format | Return error to BPM |
| Mobile Phone | 10 digits, start with 0 | Return error to BPM |
| Date fields | Valid date, not future (for DOB) | Return error to BPM |
| Sum Insured | > 0, numeric | Return error to BPM |
| Premium | > 0, numeric, 2 decimals | Return error to BPM |

---

## 6. Special Mapping Logic

### 6.1 Name Mapping (Thai + English)

| JSON Field | XML Field | Format | Max Length |
|-----------|-----------|--------|-----------|
| `PolicyHolder.0.FirstNameTH` | `S2465.LGIVNAME` | Thai | 30 chars |
| `PolicyHolder.0.LastNameTH` | `S2465.LSURNAME` | Thai | 40 chars |
| `PolicyHolder.0.FirstNameEN` | `S2465.LGIEN` | English (uppercase) | 30 chars |
| `PolicyHolder.0.LastNameEN` | `S2465.LSUEN` | English (uppercase) | 40 chars |

### 6.2 Address Splitting Logic
```java
// ตัวอย่าง javaCode สำหรับ address
String fullAddress = String.join(" ",
    nullToEmpty(sourceData.get("Address.0.PlotNumber")),
    nullToEmpty(sourceData.get("Address.0.MooNumber")),
    nullToEmpty(sourceData.get("Address.0.BuildingName")),
    nullToEmpty(sourceData.get("Address.0.LaneSOI")),
    nullToEmpty(sourceData.get("Address.0.Road"))
).replaceAll("null", "").replaceAll("\\s+", " ").trim();

// Split into 5 lines (30 chars each)
CLTADDR01 = fullAddress.substring(0, Math.min(30, fullAddress.length()));
CLTADDR02 = fullAddress.substring(30, Math.min(60, fullAddress.length()));
// ... etc
```

### 6.3 Date Format Conversions

| Source Format | Target Format | Example In | Example Out |
|--------------|---------------|------------|-------------|
| YYYY-MM-DD | YYYYMMDD | 2025-12-25 | 20251225 |
| DD/MM/YYYY | CCYYMMDD | 25/12/2025 | 20251225 |
| Timestamp | YYYYMMDD | 2025-12-25T10:30:00 | 20251225 |

---

## 7. Error Handling

### 7.1 SOAP Error Responses

| Error Code | Description | Action |
|-----------|-------------|--------|
| 417 | AS400 SOAP Fault | Log error, return to BPM |
| 500 | Internal Server Error | Log error, notify monitoring |
| 200 with ERROR node | Business Rule Error | Parse ERROR.REASON.ERRORDESC |

### 7.2 Error Response Format
```xml
<ERROR>
    <REASON>
        <ERRORDESC>รายละเอียด error</ERRORDESC>
        <ERRORFIELD>ชื่อ field ที่ error</ERRORFIELD>
    </REASON>
</ERROR>
```

---

## 8. Policy Pack Integration

### 8.1 Trigger Conditions
- ไม่ skip policy pack (`isSkipPolicyPack = false`)
- ไม่ใช่ travel online (`isTravelOnline = false`)
- SOAP response success (status 200)

### 8.2 Policy Pack Request Mapping

| Source (POLNBCRTIREC) | Target (PolicyPackRequest) |
|----------------------|---------------------------|
| `S4014.CHDRNUM` | `policyNo` |
| `S4033.CNTTYPE` | `contractType` |
| `S2465.CLTADDR01-05` | `address` (concatenated) |
| `S2465.CLTPCODE` | `postalCode` |

---

## 9. Monitoring & Logging

### 9.1 Database Logging (BpmSoapHistory)

| Field | Source | Purpose |
|-------|--------|---------|
| `jsonFileName` | Upload file | Track source file |
| `requestJsonStr` | Input JSON | Audit trail |
| `requestBpmSoap` | SOAP Request XML | Debug |
| `responseBpmSoap` | SOAP Response XML | Debug |
| `httpStatus` | Response status | Monitoring |
| `policyNo` | `S4014.CHDRNUM` | Policy tracking |

### 9.2 Email Monitoring
- ส่งไปที่: `${epolicy.monitor-mail}` (phanuwatp@generali.co.th|sahawassc@generali.co.th)
- Trigger: Critical errors, SOAP failures
- Format: HTML email with error details

---

## 10. Helper Functions Available in JavaCode

### 10.1 Groovy Helper Functions
```groovy
// Auto-injected in all javaCode executions

// 1. Get nested value from Map/List
def getNestedValue(map, path) {
    // Supports: "eAPPDetails.0.Address.0.PlotNumber"
    // Returns: value at that path or null
}

// 2. Apache Commons Lang3 (auto-imported)
import org.apache.commons.lang3.StringUtils;

// Available methods:
// - StringUtils.isNotEmpty(str)
// - StringUtils.isEmpty(str)
// - StringUtils.isNumeric(str)
// - StringUtils.leftPad(str, size, padChar)
// - StringUtils.rightPad(str, size, padChar)
// - StringUtils.trim(str)
// - StringUtils.substring(str, start, end)
```

### 10.2 Common Patterns
```java
// Pattern 1: Conditional with default
def value = getNestedValue(sourceData, "path.to.field");
return StringUtils.isNotEmpty(value) ? value : "DEFAULT";

// Pattern 2: Numeric validation and padding
def value = getNestedValue(sourceData, "field");
if (StringUtils.isNumeric(value)) {
    return StringUtils.leftPad(value, 2, '0');
}
return "00";

// Pattern 3: Multiple field concatenation
def fields = [
    getNestedValue(sourceData, "field1"),
    getNestedValue(sourceData, "field2"),
    getNestedValue(sourceData, "field3")
];
String result = fields.stream()
    .filter(v -> StringUtils.isNotEmpty(v))
    .collect(Collectors.joining(" "))
    .trim();
return result.substring(0, Math.min(30, result.length()));
```

---

## 11. Testing Guidelines

### 11.1 Test Scenarios

| Scenario | Test Data | Expected Result |
|----------|-----------|-----------------|
| Normal health policy | Complete JSON with all fields | SOAP success, policy created |
| Missing required field | JSON without National ID | SOAP error, clear message |
| Invalid date format | DOB = "25-12-2025" | Validation error |
| Special characters in name | Name with emoji/symbols | Sanitize or error |
| Long address (>150 chars) | Full Thai address | Split correctly to 5 lines |
| Multiple beneficiaries | 3 beneficiaries, 100% total | All mapped correctly |
| Travel product | With trip details | NEWTRAVEL fields populated |

### 11.2 Validation Checklist
- [ ] All required fields populated
- [ ] Date formats correct (YYYYMMDD)
- [ ] Config lookups working
- [ ] JavaCode executing without errors
- [ ] Address split correctly (30 chars/line)
- [ ] Beneficiary percentages sum to 100%
- [ ] Error handling working
- [ ] Policy Pack triggered (when applicable)

---

## 12. Maintenance Notes

### 12.1 Adding New Products
1. เพิ่ม contract type ใน config
2. สร้าง product-specific mapping ใน MappingConfig
3. เพิ่ม conditional logic ใน BPMServiceV2 (ถ้าจำเป็น)
4. Update config parameters ใน SoapBocallerParameters
5. Test thoroughly

### 12.2 Modifying Existing Mappings
1. Check impact on existing policies
2. Update mapping config in database
3. Test with sample data
4. Monitor production logs
5. Rollback plan ready

### 12.3 Adding New JavaCode Functions
1. Test in Groovy console first
2. Validate with edge cases
3. Document in this file
4. Add to mapping config
5. Monitor performance

---

## 13. API Endpoints

### 13.1 Main Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mapping/execute` | POST | Execute mapping and SOAP call |
| `/api/mapping/config/{productName}` | GET | Get mapping configuration |
| `/api/mapping/config/{productName}` | POST | Save mapping configuration |
| `/api/mapping/validate` | POST | Validate mapping config |

### 13.2 Request/Response Examples

**Execute Mapping Request:**
```json
{
  "productName": "AHI",
  "jsonData": { ... },
  "skipPolicyPack": false
}
```

**Execute Mapping Response:**
```json
{
  "result": true,
  "httpCode": "200",
  "policy_no": "P12345678",
  "master_policy": "M12345678",
  "desc": "Response submitted successfully"
}
```

---

## Appendix A: Complete Field Mapping Reference (XML-Centric)

### Section 1: MSPContext (Authentication)

| XML Field Path | JSON Source | Mapping Logic | Value Example |
|---------------|-------------|---------------|---------------|
| `MSPContext.UserId` | - | Static | `""` (empty) |
| `MSPContext.UserPassword` | - | Static | `""` (empty) |
| `MSPContext.RequestParameters` | - | Object | `new RequestParameters()` |

---

### Section 2: S2465 (Client/Insured Information)

| XML Field Path | JSON Source | Mapping Logic | Max Length | Notes |
|---------------|-------------|---------------|------------|-------|
| `S2465.ADDRTYPE` | - | Static | 1 | `"P"` (Permanent) |
| `S2465.CLTADDR01` | `eAPPDetails.0.Address.0.*` | Concat + substring(0,30) | 30 | PlotNumber + BuildingName + MooNumber + LaneSoi + Road |
| `S2465.CLTADDR02` | `eAPPDetails.0.Address.0.*` | Concat + substring(30,60) | 30 | Continuation of address line 1 |
| `S2465.CLTADDR03` | `eAPPDetails.0.Address.0.SubDistrictDesc` | Prefix with "แขวง/ตำบล" | 30 | Remove "ต.", "ตำบล", "แขวง" first |
| `S2465.CLTADDR04` | `eAPPDetails.0.Address.0.DistrictDesc` | Prefix with "เขต/อำเภอ" | 30 | Remove "อ.", "อำเภอ", "เขต" first |
| `S2465.CLTADDR05` | `eAPPDetails.0.Address.0.ProvinceName` | Prefix with "จังหวัด" or empty for BKK | 30 | Special: "กรุงเทพมหานคร" for Bangkok |
| `S2465.CLTDOBX.CCYY` | `eAPPDetails.0.Insured.0.Dob` | Date conversion (Year) | 4 | Format: BigInteger (CCYY) |
| `S2465.CLTDOBX.MM` | `eAPPDetails.0.Insured.0.Dob` | Date conversion (Month) | 2 | Format: BigInteger (MM) |
| `S2465.CLTDOBX.DD` | `eAPPDetails.0.Insured.0.Dob` | Date conversion (Day) | 2 | Format: BigInteger (DD) |
| `S2465.CLTPCODE` | `eAPPDetails.0.Address.0.ZipCode` | Direct | 5 | Postal code |
| `S2465.CLTPHONE01` | - | Not mapped | 20 | Not used in current implementation |
| `S2465.CLTPHONE02` | `eAPPDetails.0.Address.0.Mobile1` | Direct | 20 | Mobile phone (primary) |
| `S2465.CLTSEX` | `eAPPDetails.0.Insured.0.Gender` | Condition: MALE→M, FEMALE→F | 1 | Default: "U" if unknown |
| `S2465.LGIVNAME` | `eAPPDetails.0.Insured.0.FirstName` | Direct | 30 | Thai first name |
| `S2465.LSURNAME` | `eAPPDetails.0.Insured.0.LastName` | Direct | 40 | Thai last name |
| `S2465.MARRYD` | `eAPPDetails.0.Insured.0.MariStatus` | Config lookup: MARISTATUS | 1 | Marital status code |
| `S2465.NATLTY` | `eAPPDetails.0.Insured.0.Nationality` | If empty or "THAI" → "THA" | 3 | Nationality code |
| `S2465.OCCPCODE` | `eAPPDetails.0.Occupation.0.OccCode` | Direct (where category=INSURED) | 4 | Occupation code |
| `S2465.SALUTL` | `eAPPDetails.0.Insured.0.Salutation` | Config lookup: INSURED map or direct if numeric | 3 | Default: "103" |
| `S2465.SECUITYNO` | `eAPPDetails.0.Insured.0.CitizenID` or `.PassportNo` | Priority: CitizenID → PassportNo → Empty | 13 | ID or passport |

---

### Section 3: SR208 (Extended Client Info)

| XML Field Path | JSON Source | Mapping Logic | Max Length |
|---------------|-------------|---------------|------------|
| `SR208.RINTERNET` | `eAPPDetails.0.Address.0.Email` | Direct | 60 |
| `SR208.RTAXIDNUM` | - | Static | - | `""` (empty) |

---

### Section 4: S4033 (Contract Type)

| XML Field Path | JSON Source | Mapping Logic | Values |
|---------------|-------------|---------------|--------|
| `S4033.CNTTYPE` | `eAPPDetails.0.Product.ContractType` | Direct | AHI, AGI, DM, EPA, ITS, etc. |

---

### Section 5: S4014 (Policy Header)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `S4014.AGNTNAME` | - | Static | `""` |
| `S4014.AGNTSEL` | `eAPPDetails.0.Agent.0.AgentName2` | Conditional (check NOT_SEND_AGNTSEL config) | Agent code |
| `S4014.BUSORG` | - | Static | `""` |
| `S4014.CAMPAIGN` | `eAPPDetails.0.CampaignCode` | Config lookup: CAMPCODE (substring 0-6) | Campaign code |
| `S4014.CCDATE.CCYY` | Travel: `eAPPDetails.0.DepartureDate` <br> TISCO: `eAPPDetails.0.EffectiveDate` <br> Other: `eAPPDetails.0.Payment.PayReceiveDate` | Date conversion | Effective date (Year) |
| `S4014.CCDATE.MM` | (same as above) | Date conversion | Effective date (Month) |
| `S4014.CCDATE.DD` | (same as above) | Date conversion | Effective date (Day) |
| `S4014.CRDATE.CCYY` | Travel: `eAPPDetails.0.ArrivalDate` <br> TISCO: `eAPPDetails.0.Product.PolicyCessationDate` <br> Other: `eAPPDetails.0.Payment.PayReceiveDate` | Date conversion | Receipt date (Year) |
| `S4014.CRDATE.MM` | (same as above) | Date conversion | Receipt date (Month) |
| `S4014.CRDATE.DD` | (same as above) | Date conversion | Receipt date (Day) |
| `S4014.OWNERSEL` | - | Static | `""` |
| `S4014.PAYPLAN` | `eAPPDetails.0.Payment.PayMethod` + `.PayMode` + `.EtrNumber` | Function: getPaymentPlan() | D000, BI01, BI12 |
| `S4014.REPNUM` | `eAPPDetails.0.Product.ProviderCode` | Direct | Provider code |
| `S4014.SHORTDESCX` | - | Static | `""` |
| `S4014.ZREFRA` | - | Static | `""` |
| `S4014.ZSTAFFCD` | - | Static | `""` |
| `S4014.ZCOMTYP` | `eAPPDetails.0.Agent.0.AgentName2` | Lookup from BpmAgentConfig.agentComType | Commission type |
| `S4014.MPLNUM` | `eAPPDetails.0.MasterPolicy` | Direct | Master policy number |

---

### Section 6: S8415 (Mandate Reference)

| XML Field Path | JSON Source | Mapping Logic |
|---------------|-------------|---------------|
| `S8415.MANDREFPOL` | - | Static: `""` |

---

### Section 7: S8408 (Bank & Coverage Info)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `S8408.BANKACCKEY` | `eAPPDetails.0.Payment.ApprovalCode` or `.IssBankCode` | Conditional (see fillBankAccCondition) | SST: IssBankCode, Other: ApprovalCode |
| `S8408.BANKKEY` | - | Conditional: "2C" or Payment.BankCode | Bank code |
| `S8408.EFFDATE.CCYY` | `eAPPDetails.0.Payment.PayReceiveDate` | Date conversion | Default: 9999 |
| `S8408.EFFDATE.MM` | (same) | Date conversion | Default: 99 |
| `S8408.EFFDATE.DD` | (same) | Date conversion | Default: 99 |
| `S8408.FACTHOUSA` | - | Conditional: "2C" or Payment.BankCode | Factor house |

---

### Section 8: S2081 (Bank Account Details)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `S2081.BANKACCDSC` | `eAPPDetails.0.Insured.0.FirstName + LastName` or `Payment.BankName` | SST: BankName, Other: Full name (max 30) | Account description |
| `S2081.BNKACTYP` | - | Conditional: CC01/MC01 based on IssBankCode or Payment.BankAccNo | SST: BankAccNo, Visa: CC01, Master: MC01 |
| `S2081.DUEDT` | - | SST: `Payment.IssBranchName`, Other: "122098" | Due date / branch |
| `S2081.NEWRQST` | - | Static: "N" | - |

---

### Section 9: SR497 (Exclusion Clauses)

| XML Field Path | JSON Source | Mapping Logic | Max Length |
|---------------|-------------|---------------|------------|
| `SR497.CLAUDESC01` | `eAPPDetails.0.UwValidation[0].ShortExclusion` | Filter: result=ACCEPTEDEXCLUSION, sorted by UwRuleNo | - |
| `SR497.CLAUDESC02` | `eAPPDetails.0.UwValidation[1].ShortExclusion` | (same filter) | - |
| `SR497.CLAUDESC03` | `eAPPDetails.0.UwValidation[2].ShortExclusion` | (same filter, max 3 items) | - |

---

### Section 10: SZ013 (Consent & Delivery)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `SZ013.BANKACCDSC` | `eAPPDetails.0.Insured.0.FirstName + LastName` | Only if payment method is CREDITCARD+MONTHLY/YEARLY+ETR=YES | Full name (max 30) |
| `SZ013.BANKACCKEY` | `eAPPDetails.0.RefundPayment.BankAccNo` | If refundPayment.PayMethod = BANKACCOUNT | Bank account number |
| `SZ013.BNKSAV` | `eAPPDetails.0.RefundPayment.PayMethod` | PROMPTPAY→PNID, BANKACCOUNT→AC01 | Payment method |
| `SZ013.CONDATE01.CCYY` | `eAPPDetails.0.Consent.0.ConsentDateTime` (MARKETINGCONSENT) | Date conversion | Consent date 1 |
| `SZ013.CONDATE01.MM` | (same) | Date conversion | - |
| `SZ013.CONDATE01.DD` | (same) | Date conversion | - |
| `SZ013.CONDATE02.CCYY` | `eAPPDetails.0.Consent.1.ConsentDateTime` (TAXCONSENT) | Date conversion or 9999 if empty | Consent date 2 |
| `SZ013.CONDATE02.MM` | (same) | Date conversion or 99 | - |
| `SZ013.CONDATE02.DD` | (same) | Date conversion or 99 | - |
| `SZ013.CONFLG` | `eAPPDetails.0.Consent.0.Answer` (MARKETINGCONSENT) | Direct | Y/N |
| `SZ013.CONFLGTYP` | - | Static: "000" | - |
| `SZ013.CONSDTA01` | `eAPPDetails.0.Product.BasicPlan` | Config lookup: BASIC_PLAN_CONSDTA01 | Consent data 1 |
| `SZ013.CONSDTA02` | `eAPPDetails.0.Product.BasicPlan` | Config lookup: BASIC_PLAN_CONSDTA02 | Consent data 2 |
| `SZ013.CONSTIME01` | - | Static: 0 | - |
| `SZ013.CONSTIME02` | - | Static: 0 | - |
| `SZ013.DLVRY01` | `eAPPDetails.0.PolicyDispatchMode` | BYPAPER→01, BYEMAIL→02 | Policy delivery |
| `SZ013.DLVRY02` | `eAPPDetails.0.OtherDocumentsDeliveryMode` | BYPAPER→01, BYEMAIL→02 | Document delivery |
| `SZ013.REVENUEFG` | `eAPPDetails.0.Consent.1.Answer` (TAXCONSENT) | Direct | Y/N |
| `SZ013.SCOSNVER01` | - | Static: `""` | - |
| `SZ013.SCOSNVER02` | - | Static: `""` | - |
| `SZ013.ZTBANK` | `eAPPDetails.0.RefundPayment.BankCode` | If refundPayment.PayMethod = BANKACCOUNT | Bank code |

---

### Section 11: SR410 (Method)

| XML Field Path | JSON Source | Mapping Logic |
|---------------|-------------|---------------|
| `SR410.METHOD` | - | Static: `""` |

---

### Section 12: ST819 (Short Description)

| XML Field Path | JSON Source | Mapping Logic |
|---------------|-------------|---------------|
| `ST819.SHORTDESCX` | - | Static: `""` |

---

### Section 13: S2480 (Payer Action)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `S2480.ACTION` | `eAPPDetails.0.Payer.0.OwnerType` | If OwnerType="C" → "B", else `""` | Corporate payer |

---

### Section 14: S2466 (Corporate Payer Info)

| XML Field Path | JSON Source | Mapping Logic | Max Length | Condition |
|---------------|-------------|---------------|------------|-----------|
| `S2466.CLTADDR01` | `eAPPDetails.0.Address.* (PAYER)` | Concat address substring(0,30) | 30 | If Payer.OwnerType="C" |
| `S2466.CLTADDR02` | (same) | Concat address substring(30,60) | 30 | (same) |
| `S2466.CLTADDR03` | `Address.SubDistrictDesc` | Direct | 30 | (same) |
| `S2466.CLTADDR04` | `Address.DistrictDesc` | Direct | 30 | (same) |
| `S2466.CLTADDR05` | `Address.ProvinceName` | Direct | 30 | (same) |
| `S2466.CLTPCODE` | `Address.ZipCode` | Direct | 5 | (same) |
| `S2466.CLTPHONE01` | `Address.Mobile1` | Direct | 20 | (same) |
| `S2466.CLTPHONE02` | - | Static: `""` | - | - |
| `S2466.CTRYORIG` | - | Static: `""` | - | - |
| `S2466.LGIVNAME` | `eAPPDetails.0.Payer.0.FirstName` | If >60 chars: substring(60,120) | 60 | Line 2 of company name |
| `S2466.LSURNAME` | `eAPPDetails.0.Payer.0.FirstName` | substring(0,60) | 60 | Line 1 of company name |
| `S2466.SECUITYNO` | - | Static: `""` | - | - |

---

### Section 15: SR209 (Corporate Tax Info)

| XML Field Path | JSON Source | Mapping Logic | Condition |
|---------------|-------------|---------------|-----------|
| `SR209.BRCODE` | - | Static: `""` | - |
| `SR209.BRNAME` | - | Static: `""` | - |
| `SR209.RINTERNET` | - | Static: `""` | - |
| `SR209.RTAXIDNUM` | `eAPPDetails.0.Payer.0.CitizenID` | Direct | If Payer.OwnerType="C" |
| `SR209.ZVATFLAG` | - | Static: `""` | - |

---

### Section 16: SZ672 (Vehicle Info - All Empty for Health/PA)

| XML Field Path | Value | Notes |
|---------------|-------|-------|
| `SZ672.CAPTYP` | `""` | Not used for health products |
| `SZ672.CHASSI` | `""` | - |
| `SZ672.CRCAPY` | `0` | - |
| `SZ672.DSI` | `0` | - |
| `SZ672.ENGINE` | `""` | - |
| `SZ672.MMCODE` | `""` | - |
| `SZ672.NOSEAT` | `0` | - |
| `SZ672.PROVINCE` | `""` | - |
| `SZ672.REGNO` | `""` | - |
| `SZ672.TVEHCLS` | `""` | - |
| `SZ672.USEFOR` | `""` | - |
| `SZ672.USEFUEL` | `""` | - |
| `SZ672.YRMANF` | `0` | - |
| `SZ672.ZCOLOUR` | `""` | - |
| `SZ672.ZVHBOD` | `""` | - |
| `SZ672.ZMOTMAK` | `""` | - |
| `SZ672.VHMODEL` | `""` | - |

---

### Section 17: ADDITIONALFIELDS.PAYORSET (Personal Payer Info)

| XML Field Path | JSON Source | Mapping Logic | Condition |
|---------------|-------------|---------------|-----------|
| `PAYORSET.SECUITYNO` | `eAPPDetails.0.Payer.0.CitizenID` or `.PassportNo` | Priority: CitizenID → PassportNo | If OwnerType="P" AND CitizenID ≠ Insured.CitizenID |
| `PAYORSET.ADDRTYPE` | - | Static: "P" | (same) |
| `PAYORSET.CLTADDRA` | `eAPPDetails.0.Address.* (PAYER)` | Full address substring(0,30) | (same) |
| `PAYORSET.CLTADDRB` | (same) | Full address substring(30,60) | (same) |
| `PAYORSET.CLTADDRC` | `Address.SubDistrictDesc` | Direct | (same) |
| `PAYORSET.CLTADDRD` | `Address.DistrictDesc` | Direct | (same) |
| `PAYORSET.CLTADDRE` | `Address.ProvinceName` | Direct | (same) |
| `PAYORSET.CLTDOBXA.CCYY` | `eAPPDetails.0.Payer.0.Dob` | Date conversion (Year) | (same) |
| `PAYORSET.CLTDOBXA.MM` | (same) | Date conversion (Month) | (same) |
| `PAYORSET.CLTDOBXA.DD` | (same) | Date conversion (Day) | (same) |
| `PAYORSET.CLTPCODEA` | `Address.ZipCode` | Direct | (same) |
| `PAYORSET.CLTPHONA` | `Address.Mobile1` | Direct | (same) |
| `PAYORSET.CLTSEA` | `eAPPDetails.0.Payer.0.Gender` | MALE→M, FEMALE→F, else U | (same) |
| `PAYORSET.LGIVNAMEA` | `eAPPDetails.0.Payer.0.FirstName` | Direct | (same) |
| `PAYORSET.LSURNAMEA` | `eAPPDetails.0.Payer.0.LastName` | Direct | (same) |
| `PAYORSET.MARRYDA` | `eAPPDetails.0.Payer.0.MariStatus` | Config lookup: MARISTATUS | (same) |
| `PAYORSET.NATLTYA` | `eAPPDetails.0.Payer.0.Nationality` | Direct | (same) |
| `PAYORSET.OCCPCODEA` | `eAPPDetails.0.Occupation.* (PAYER)` | Direct (where category=PAYER) | (same) |
| `PAYORSET.ASALUTL` | `eAPPDetails.0.Payer.0.Salutation` | Config lookup: INSURED map | (same) |

---

### Section 18: ADDITIONALFIELDS.RSKTYP (Risk Type)

| XML Field Path | JSON Source | Mapping Logic |
|---------------|-------------|---------------|
| `RSKTYP.RSKTYP1X` | `eAPPDetails.0.Product.RiskType` | Direct (convert to String) |
| `RSKTYP.RSKTYP2X` | - | Static: `""` |
| `RSKTYP.RSKTYP3X` | - | Static: `""` |

---

### Section 19: ADDITIONALFIELDS.RSKNO (Risk Number)

| XML Field Path | JSON Source | Mapping Logic |
|---------------|-------------|---------------|
| `RSKNO.RSKNO1X` | `eAPPDetails.0.Product.SystemCode` | Convert to BigInteger or 0 |
| `RSKNO.RSKNO2X` | - | Static: 0 |
| `RSKNO.RSKNO3X` | - | Static: 0 |

---

### Section 20: ADDITIONALFIELDS.RSKDATA (Risk Data)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `RSKDATA.BENIF1X` | - | Static: `""` | - |
| `RSKDATA.BENIF2X` | - | Static: `""` | - |
| `RSKDATA.BENIF3X` | - | Static: `""` | - |
| `RSKDATA.PATYPE1X` | - | Static: `""` | - |
| `RSKDATA.PATYPE2X` | - | Static: `""` | - |
| `RSKDATA.PATYPE3X` | - | Static: `""` | - |
| `RSKDATA.RELAT1X` | - | Static: `""` | - |
| `RSKDATA.RELAT2X` | - | Static: `""` | - |
| `RSKDATA.RELAT3X` | - | Static: `""` | - |
| `RSKDATA.SCLASI1X` | `eAPPDetails.0.Occupation.0.OccClass` | If numeric: leftPad(2,'0'), SW partner special: "04" for invalid, else "00" | Occupation class |
| `RSKDATA.SCLASI2X` | - | Static: "0" | - |
| `RSKDATA.SCLASI3X` | - | Static: "0" | - |
| `RSKDATA.ADDPREM01X` | `eAPPDetails.0.Product.DiscountAmount` | If >0: multiply by -1 | Discount as negative premium |
| `RSKDATA.ADDPREM02X` | - | Static: 0 | - |
| `RSKDATA.ADDPREM03X` | - | Static: 0 | - |
| `RSKDATA.SPREMD1X` | `eAPPDetails.0.Product.PDScale` | Convert to String | Premium scale |
| `RSKDATA.SPREMD2X` | - | Static: `""` | - |
| `RSKDATA.SPREMD3X` | - | Static: `""` | - |
| `RSKDATA.NOLIVE01X` | - | Static: 1 | Number of lives |
| `RSKDATA.NOLIVE02X` | - | Static: 0 | - |
| `RSKDATA.NOLIVE03X` | - | Static: 0 | - |
| `RSKDATA.ZPAREG1X` | - | Static: `""` | - |
| `RSKDATA.ZPAREG2X` | - | Static: `""` | - |
| `RSKDATA.ZPAREG3X` | - | Static: `""` | - |
| `RSKDATA.PLANCDE01X` | `eAPPDetails.0.Product.PlanCode` | Convert to String | Plan code |
| `RSKDATA.PLANCDE02X` | - | Static: `""` | - |
| `RSKDATA.PLANCDE03X` | - | Static: `""` | - |

---

### Section 21: ADDITIONALFIELDS.POLDATA (Beneficiary Data)

**Note**: Supports up to 3 beneficiaries, sorted by CustomerID

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `POLDATA.ALINE01X` | `eAPPDetails.0.Beneficiary[0].*` | Concat: Salutation(from BENEF map) + FirstName + LastName + Percent(TISCO only) | Beneficiary 1 name |
| `POLDATA.ALINE02X` | `eAPPDetails.0.Beneficiary[0].InsRel` | Config lookup: RELATION or RELATION-TISCO | Beneficiary 1 relationship |
| `POLDATA.ALINE03X` | `eAPPDetails.0.Beneficiary[1].*` | (same as ALINE01X) | Beneficiary 2 name |
| `POLDATA.ALINE04X` | `eAPPDetails.0.Beneficiary[1].InsRel` | (same as ALINE02X) | Beneficiary 2 relationship |
| `POLDATA.ALINE05X` | `eAPPDetails.0.Beneficiary[2].*` | (same as ALINE01X) | Beneficiary 3 name |
| `POLDATA.ALINE06X` | `eAPPDetails.0.Beneficiary[2].InsRel` | (same as ALINE02X) | Beneficiary 3 relationship |
| `POLDATA.ALINE07X` | - | Static: `""` | - |
| `POLDATA.ALINE08X` | - | Static: `""` | - |
| `POLDATA.ALINE09X` | - | Static: `""` | - |
| `POLDATA.ALINE10X` | - | Static: `""` | - |
| `POLDATA.ALINE11X` | - | Static: `""` | - |
| `POLDATA.ALINE12X` | - | Static: `""` | - |
| `POLDATA.ALINE13X` | - | Static: `""` | - |
| `POLDATA.ALINE14X` | - | Static: `""` | - |
| `POLDATA.ALINE15X` | - | Static: `""` | - |

---

### Section 22: ADDITIONALFIELDS.KKFEDATA (KKP/Partner Data)

| XML Field Path | JSON Source | Mapping Logic |
|---------------|-------------|---------------|
| `KKFEDATA.GTAPPNO` | `eAPPDetails.0.AppNo` | Convert to String |
| `KKFEDATA.KKAPPNO` | TISCO: `eAPPDetails.0.LoanNo` <br> Other: `eAPPDetails.0.PartnerRef` | Conditional |
| `KKFEDATA.GBRANCDE` | - | Static: `""` |
| `KKFEDATA.LBRANCH` | - | Static: `""` |
| `KKFEDATA.AREACDE` | - | Static: `""` |
| `KKFEDATA.PLDESC` | - | Static: `""` |
| `KKFEDATA.STAFFCDE` | `eAPPDetails.0.RefferalCode` | Convert to String (max 10 chars, rest to ZCAMPGND) |
| `KKFEDATA.LASALUT` | - | Static: `""` |
| `KKFEDATA.AGENTNAME` | - | Static: `""` |
| `KKFEDATA.TSURNAME` | - | Static: `""` |
| `KKFEDATA.SUMINS` | `eAPPDetails.0.Product.Sa` | Convert to BigDecimal |
| `KKFEDATA.NETPRM` | - | Static: 0.0 |
| `KKFEDATA.VATAMT` | - | Static: 0.0 |
| `KKFEDATA.STAMPDUTY` | - | Static: 0.0 |
| `KKFEDATA.WHTAX` | - | Static: 0.0 |
| `KKFEDATA.PREMIUM` | `eAPPDetails.0.Product.BasicPrem` | Convert to BigDecimal |
| `KKFEDATA.DISCOUNT` | - | Static: 0.0 |
| `KKFEDATA.GROSSPRM` | - | Static: 0.0 |
| `KKFEDATA.INSCARDTYP` | - | Static: "001" |
| `KKFEDATA.MRKFLAG` | `eAPPDetails.0.MarketingFlag` | Convert to String |

---

### Section 23: ADDITIONALFIELDS.RIDERPLAN (Rider Benefits)

**Note**: Supports up to 10 riders from `eAPPDetails.0.Riders[]`

| XML Field Path | JSON Source | Mapping Logic | Format |
|---------------|-------------|---------------|--------|
| `RIDERPLAN.RIDER1X` | `Riders[0].RiderCode` | Direct (strip whitespace) | - |
| `RIDERPLAN.RDRANT1X` | `Riders[0].RiderSA` | Format: %05d (5 digits, zero-padded) | e.g., "01000" |
| `RIDERPLAN.RIDER2X` | `Riders[1].RiderCode` | (same) | - |
| `RIDERPLAN.RDRANT2X` | `Riders[1].RiderSA` | (same) | - |
| ... | ... | ... | ... |
| `RIDERPLAN.RIDER10X` | `Riders[9].RiderCode` | (same) | - |
| `RIDERPLAN.RDRANT10X` | `Riders[9].RiderSA` | (same) | - |

*Default: All fields = `" "` (space) if no riders*

---

### Section 24: ADDITIONALFIELDS.PERSONINF (Personal Info Extended)

| XML Field Path | JSON Source | Mapping Logic | Notes |
|---------------|-------------|---------------|-------|
| `PERSONINF.ZWGHT` | `eAPPDetails.0.Insured.0.Weight` | BpmSoapCommans.convertDecimal(3) | Weight in kg (3 decimals) |
| `PERSONINF.ZHGHT` | `eAPPDetails.0.Insured.0.Height` | BpmSoapCommans.convertDecimal(3) | Height in cm (3 decimals) |
| `PERSONINF.ZBMIVAL` | `eAPPDetails.0.Insured.0.BMIValue` | BpmSoapCommans.convertDecimal(2) | BMI (2 decimals) |
| `PERSONINF.ZPAYORID` | - | Static: `" "` | - |
| `PERSONINF.ZCAMPGND` | `eAPPDetails.0.CampaignCode` or overflow from STAFFCDE | If STAFFCDE >10 chars: substring(10), else CampaignCode from CAMPCODE config | Campaign code |
| `PERSONINF.EIND` | - | Static: `" "` | - |

---

### Section 25: ADDITIONALFIELDS.NEWTRAVEL (Travel Info)

**Condition**: Only populated if `isTravel = true`

| XML Field Path | JSON Source | Mapping Logic | Default (Non-Travel) |
|---------------|-------------|---------------|---------------------|
| `NEWTRAVEL.CTRYA` | `eAPPDetails.0.DepartureCountry` | Lookup CountryCodes.Alpha3 | `""` |
| `NEWTRAVEL.CTRYB` | `eAPPDetails.0.Destination` | Lookup CountryCodes.Alpha3 | `""` |
| `NEWTRAVEL.CTRYC` | - | - | `""` |
| `NEWTRAVEL.NOMBR` | `eAPPDetails.0.NoOfTraveller` | Convert to BigInteger | 0 |
| `NEWTRAVEL.DATEFRM.CCYY` | `eAPPDetails.0.DepartureDate` | Date conversion | 9999 |
| `NEWTRAVEL.DATEFRM.MM` | (same) | Date conversion | 99 |
| `NEWTRAVEL.DATEFRM.DD` | (same) | Date conversion | 99 |
| `NEWTRAVEL.DATETO.CCYY` | `eAPPDetails.0.ArrivalDate` | Date conversion | 9999 |
| `NEWTRAVEL.DATETO.MM` | (same) | Date conversion | 99 |
| `NEWTRAVEL.DATETO.DD` | (same) | Date conversion | 99 |
| `NEWTRAVEL.SXTIMEA` | - | - | 0 |
| `NEWTRAVEL.SXTIMEB` | - | - | 0 |
| `NEWTRAVEL.TOTDAY` | `eAPPDetails.0.NoOfDay` | Convert to BigInteger | 0 |
| `NEWTRAVEL.TRIPCDA` | - | - | `""` |
| `NEWTRAVEL.TRIPCDB` | - | - | `""` |

---

### Section 26: ADDITIONALFIELDS.LNAMESET (Long Name for Travel)

**Condition**: Only populated if `isTravel = true`

| XML Field Path | JSON Source | Mapping Logic | Default (Non-Travel) |
|---------------|-------------|---------------|---------------------|
| `LNAMESET.LNAMEA` | `eAPPDetails.0.LongFirstNameEng` | Direct | `""` |
| `LNAMESET.LNAMEB` | `eAPPDetails.0.LongLastNameEng` | Direct | `""` |
| `LNAMESET.LNAMEC` | - | - | `""` |
| `LNAMESET.LNAMED` | - | - | `""` |
| `LNAMESET.LNAMEE` | - | - | `""` |

---

## Appendix B: Mapping Helper Functions Reference

### 1. Address Processing Functions

```java
// getFullAddress(Address address)
// Returns: PlotNumber + BuildingName + MooNumber + LaneSoi + Road
// Output: "บ้านเลขที่ 123 ซอย 45 ถนน สุขุมวิท"

// prefixAddress(Address address)
// - SubDistrict: Add "แขวง" (BKK) or "ตำบล" (other)
// - District: Add "เขต" (BKK) or "อำเภอ" (other)
// - Province: Add "จังหวัด" or change to "กรุงเทพมหานคร" for Bangkok
```

### 2. Date Conversion Functions

```java
// BpmSoapCommans.convertStrDateToMap(String date)
// Input: "2025-12-25"
// Output: Map {CCYY: "2025", MM: "12", DD: "25"}

// BpmSoapCommans.convertCONDateToMap(String datetime)
// Input: "2025-12-25T10:30:00"
// Output: Map {CCYY: "2025", MM: "12", DD: "25"}

// BpmSoapCommans.convertStrCRDATEToMap(String date)
// Special conversion for CRDATE field
```

### 3. Config Lookup Functions

```java
// getParameter(String bpmKey, String keyword)
// Query: soapBocallerParametersRepo.findFirstByBpmKeyAndOutputAndSystemType(bpmKey, keyword, "NL")
// Returns: Input field (AS400 code)

// getSalutationCode(Map insSaluMap, String salutation)
// Priority: 1) If numeric → return as-is, 2) Lookup in map, 3) Default "103"

// getNationality(String nationality)
// If empty or "THAI" → return "THA", else return original
```

### 4. Payment Plan Mapping

```java
// getPaymentPlan(Payment payment)
// Logic:
// - If PayMethod = CREDITCARD:
//   - If PayMode = ANNUAL/YEARLY + EtrNumber = YES → "BI01"
//   - If PayMode = ANNUAL/YEARLY + EtrNumber ≠ YES → "D000"
//   - If PayMode = MONTHLY → "BI12"
// - Else → "D000"
```

### 5. Beneficiary Name Construction

```java
// Format: [Salutation] [FirstName] [LastName] [Percent%] (TISCO only)
// Example: "นาย สมชาย ใจดี 50%" (TISCO)
// Example: "นาง สมหญิง ใจดี" (Other partners)
```

---

## Appendix C: Configuration Parameters Complete List

### Config Key: INSURED (Salutation Mapping)

| Output (BPM) | Input (AS400) | Description |
|-------------|---------------|-------------|
| นาย | 101 | Mr. |
| นาง | 102 | Mrs. |
| นางสาว | 103 | Miss (default) |
| เด็กชาย | 104 | Boy |
| เด็กหญิง | 105 | Girl |
| (numeric) | (same) | If already numeric, use as-is |

### Config Key: BENEF (Beneficiary Salutation)

| Output (BPM) | Input (AS400) | Description |
|-------------|---------------|-------------|
| นาย | 01 | Mr. (Beneficiary) |
| นาง | 02 | Mrs. (Beneficiary) |
| นางสาว | 03 | Miss (Beneficiary) |

### Config Key: RELATION / RELATION-TISCO (Relationship)

| Output (BPM) | Input (AS400) | Description |
|-------------|---------------|-------------|
| FATHER | 01 | Father |
| MOTHER | 02 | Mother |
| SPOUSE | 03 | Spouse |
| CHILD | 04 | Child |
| SIBLING | 05 | Brother/Sister |
| OTHER | 99 | Other |

### Config Key: CAMPCODE (Campaign)

| Output (BPM) | Input (AS400) | Description |
|-------------|---------------|-------------|
| CAMP01 | C001 | Campaign 2025 |
| CAMP02 | C002 | New Year Promotion |
| ... | ... | ... |

### Config Key: MARISTATUS (Marital Status)

| Output (BPM) | Input (AS400) | Description |
|-------------|---------------|-------------|
| SINGLE | S | Single |
| MARRIED | M | Married |
| DIVORCED | D | Divorced |
| WIDOWED | W | Widowed |

### Config Key: OCCCODE (Occupation)

| Input (AS400 Code) | Output (Thai Description) |
|-------------------|-------------------------|
| 0001 | ข้าราชการ |
| 0002 | พนักงานบริษัท |
| 0003 | ธุรกิจส่วนตัว |
| ... | ... |

### Config Key: T3583 (Title for Policy Pack)

| Input (AS400 Code) | Output (Display) |
|-------------------|-----------------|
| 101 | นาย |
| 102 | นาง |
| 103 | นางสาว |

### Config Key: BASIC_PLAN_CONSDTA01 & CONSDTA02

| Input (Plan Code) | CONSDTA01 | CONSDTA02 |
|------------------|-----------|-----------|
| AHI001 | CONS_V1 | DATA_V1 |
| DM001 | CONS_V2 | DATA_V2 |
| ... | ... | ... |

### Config Key: POLICYPACK_URL

| Input (Plan Codes CSV) | Output (URL) |
|----------------------|-------------|
| AHI001,AHI002,AHI003 | http://172.16.64.22:8081/e-health |
| DM001,DM002 | http://172.16.64.22:8081/e-health-dm |
| EPA001,EPA002 | http://172.16.64.22:8081/e-pa |
| AGIAGIKM | http://172.16.64.22:8081/e-health-epa |
| ETRVL* | http://172.16.64.22:8079/d2c-e-travel |

### Config Key: NOT_SEND_AGNTSEL

| Input (SubChannel) | Action |
|-------------------|--------|(keep empty) |
| TISCO_ONLINE | Do not set AGNTSEL (keep empty) |
| (other) | Set AGNTSEL = Agent.AgentName2
| TISCO_ONLINE | Do not set AGNTSEL |

### Config Key: TRAVEL-ONLINE

| Input (SubChannel) | Result |
|-------------------|--------|
| TRVL_ONLINE | isTravelOnline = true |

### Config Key: TRAVEL-OFFLINE

| Input (SubChannel) | Result |
|-------------------|--------|
| TRVL_OFFLINE | isTravelOffline = true |

### Config Key: SKIP_POLICYPACK

| Input (BussSource) | Result |
|-------------------|--------|
| SST | Skip Policy Pack = true |
| INTERNAL_TEST | Skip Policy Pack = true |

### Config Key: MASTER_POLICY (for GPAF2F)

| Input (Master Policy No) | Output (Master Policy Name) |
|------------------------|---------------------------|
| MP001 | Master Policy Group A |
| MP002 | Master Policy Group B |

---

## Summary Statistics

**Total XML Fields Mapped**: 250+  
**Total Config Parameters**: 100+  
**Conditional Logic Blocks**: 25+  
**Helper Functions**: 15+  

**Key Sections**:8 fields
- Policy Header (S4014): 14 fields  
- Risk Data (RSKDATA): 20+ fields
- Beneficiary Data (POLDATA): 15 fields
- Travel Data (NEWTRAVEL): 13 fields
- Payer Info (PAYORSET): 17 fields
- Consent & Delivery (SZ013): 17 fields

**Business Logic Notes**:
- Print Card Logic: AGI/ITS products → PrintCard="N", others → "Y"
- OPD Coverage (DM products): Extract H5 rider from rider list if planCode in [AHSAHDT1-6]
- Travel products use different date fields (DepartureDate/ArrivalDate vs EffectiveDate)
- TISCO partner has special logic for beneficiary percentage display
- SST business source has different bank account mapping logic
- Consent & Delivery (SZ013): 17 fields

---

## Appendix B: Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-22 | 1.0 | Initial version with Groovy support | Dev Team |
| 2025-12-22 | 1.1 | Added javaCode mapping capability | Dev Team |
| 2025-12-25 | 1.2 | Documentation created | Copilot |

---

**หมายเหตุ**: เอกสารนี้สามารถ copy ไป Microsoft Word ได้โดยตรง ตารางจะแสดงผลอย่างถูกต้อง
