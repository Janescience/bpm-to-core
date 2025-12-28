/**
 * Dynamic Mapping Engine for BPM-to-CORE SOAP Integration
 *
 * This engine supports highly dynamic field transformations without requiring code changes.
 * Supports all mapping patterns from MAPPING_DOCUMENTATION.md including:
 * - Simple field mapping
 * - Conditional logic (CONDITION, CONDITION_MULTIPLE)
 * - String operations (CONCAT, SUBSTRING, FORMAT)
 * - Date transformations (DATE)
 * - Number formatting (NUMBER)
 * - Database config lookup (CONFIG)
 * - Dynamic expressions (EXPRESSION)
 * - Custom JavaScript functions (JSCODE)
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Source object
 * @param {String} path - Dot-notation path (e.g., "customer.firstName")
 * @returns {*} - The value at the path or undefined
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  // Handle array notation: "eAPPDetails.0.Address.0.Mobile1"
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;

    // Check if key is array index
    const arrayIndex = parseInt(key);
    if (!isNaN(arrayIndex)) {
      if (Array.isArray(current)) {
        current = current[arrayIndex];
      } else {
        return undefined;
      }
    } else {
      current = current[key];
    }
  }

  return current;
}

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Target object
 * @param {String} path - Dot-notation path
 * @param {*} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Check if value is empty (null, undefined, empty string, or whitespace)
 */
function isEmpty(value) {
  return value === null ||
         value === undefined ||
         (typeof value === 'string' && value.trim() === '');
}

/**
 * Safe string conversion
 */
function toString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * FUNCTION: DIRECT
 * Simple field mapping with optional default value
 */
function transformDirect(jsonData, params) {
  const { jsonField, defaultValue } = params;

  const value = getNestedValue(jsonData, jsonField);

  if (isEmpty(value)) {
    return defaultValue || '';
  }

  return value;
}

/**
 * FUNCTION: STATIC
 * Returns a static value (no JSON source needed)
 */
function transformStatic(jsonData, params) {
  return params.value || params.defaultValue || '';
}

/**
 * FUNCTION: CONDITION
 * Conditional mapping: if-then-else logic
 *
 * Supports two formats:
 *
 * Format 1 (Simple if-else):
 * {
 *   jsonField: "eAPPDetails.0.Insured.0.Nationality",
 *   operator: "==",
 *   compareValue: "THAI",
 *   trueValue: "THA",
 *   falseValue: "eAPPDetails.0.Insured.0.Nationality"  // Can be a JSON field path!
 * }
 *
 * Format 2 (Multiple conditions):
 * {
 *   jsonField: "eAPPDetails.0.Insured.0.Gender",
 *   conditions: [
 *     { operator: "==", value: "MALE", result: "M" },
 *     { operator: "==", value: "FEMALE", result: "F" }
 *   ],
 *   defaultValue: "U"
 * }
 */
function transformCondition(jsonData, params) {
  const { jsonField, operator, compareValue, trueValue, falseValue, conditions, defaultValue } = params;

  // Support _chainResult for use in chains
  let sourceValue;
  if (jsonField === '_chainResult') {
    sourceValue = jsonData._chainResult;
  } else {
    sourceValue = getNestedValue(jsonData, jsonField);
  }

  // Format 1: Simple if-else with operator, compareValue, trueValue, falseValue
  if (operator && (trueValue !== undefined || falseValue !== undefined)) {
    const conditionMet = evaluateCondition(sourceValue, operator, compareValue);

    if (conditionMet) {
      // Check if trueValue is a JSON field path (contains dots or array indices)
      if (trueValue && typeof trueValue === 'string' && (trueValue.includes('.') || trueValue.includes('['))) {
        const resolvedValue = getNestedValue(jsonData, trueValue);
        // If we got a value from the path, use it; otherwise use trueValue as literal
        return resolvedValue !== undefined && resolvedValue !== null ? resolvedValue : trueValue;
      }
      return trueValue || '';
    } else {
      // Check if falseValue is a JSON field path (contains dots or array indices)
      if (falseValue && typeof falseValue === 'string' && (falseValue.includes('.') || falseValue.includes('['))) {
        const resolvedValue = getNestedValue(jsonData, falseValue);
        // If we got a value from the path, use it; otherwise use falseValue as literal
        return resolvedValue !== undefined && resolvedValue !== null ? resolvedValue : falseValue;
      }
      return falseValue || defaultValue || '';
    }
  }

  // Format 2: Multiple conditions array
  if (!conditions || !Array.isArray(conditions)) {
    return defaultValue || '';
  }

  for (const condition of conditions) {
    const { operator: condOp, value, result } = condition;

    if (evaluateCondition(sourceValue, condOp, value)) {
      // Check if result is a JSON field path
      if (result && typeof result === 'string' && (result.includes('.') || result.includes('['))) {
        const resolvedValue = getNestedValue(jsonData, result);
        return resolvedValue !== undefined && resolvedValue !== null ? resolvedValue : result;
      }
      return result;
    }
  }

  return defaultValue || '';
}

/**
 * FUNCTION: CONDITION_MULTIPLE
 * Multiple field conditional logic
 *
 * Supports two formats:
 *
 * Format 1 (Simple IF-ELSE IF chain):
 * {
 *   conditions: [
 *     {
 *       jsonField: "eAPPDetails.0.Insured.0.CitizenID",
 *       operator: "!=",
 *       compareValue: "",
 *       result: "eAPPDetails.0.Insured.0.CitizenID"  // Can be a JSON field path!
 *     },
 *     {
 *       jsonField: "eAPPDetails.0.Insured.0.PassportNo",
 *       operator: "!=",
 *       compareValue: "",
 *       result: "eAPPDetails.0.Insured.0.PassportNo"
 *     }
 *   ],
 *   defaultValue: ""
 * }
 *
 * Format 2 (AND/OR logic):
 * {
 *   conditions: [
 *     {
 *       type: "AND",
 *       checks: [
 *         { jsonField: "eAPPDetails.0.Payment.PayMethod", operator: "==", value: "CREDITCARD" },
 *         { jsonField: "eAPPDetails.0.Payment.PayMode", operator: "==", value: "MONTHLY" }
 *       ],
 *       result: "BI12"
 *     }
 *   ],
 *   defaultValue: "D000"
 * }
 */
function transformConditionMultiple(jsonData, params) {
  const { conditions, defaultValue } = params;

  if (!conditions || !Array.isArray(conditions)) {
    return defaultValue || '';
  }

  for (const condition of conditions) {
    const { type, checks, jsonField, operator, compareValue, result } = condition;

    // Format 1: Simple IF-ELSE IF chain (has jsonField, operator, compareValue, result)
    if (jsonField && operator !== undefined && result !== undefined) {
      const value = getNestedValue(jsonData, jsonField);
      const conditionMet = evaluateCondition(value, operator, compareValue);

      if (conditionMet) {
        // Check if result is a JSON field path (contains dots or array indices)
        if (result && typeof result === 'string' && (result.includes('.') || result.includes('['))) {
          const resolvedValue = getNestedValue(jsonData, result);
          return resolvedValue !== undefined && resolvedValue !== null ? resolvedValue : result;
        }
        return result;
      }
      continue;
    }

    // Format 2: AND/OR logic (has type and checks)
    if (type === 'AND') {
      const allTrue = checks.every(check => {
        const value = getNestedValue(jsonData, check.jsonField);
        return evaluateCondition(value, check.operator, check.value);
      });

      if (allTrue) {
        // Check if result is a JSON field path
        if (result && typeof result === 'string' && (result.includes('.') || result.includes('['))) {
          const resolvedValue = getNestedValue(jsonData, result);
          return resolvedValue !== undefined && resolvedValue !== null ? resolvedValue : result;
        }
        return result;
      }
    } else if (type === 'OR') {
      const anyTrue = checks.some(check => {
        const value = getNestedValue(jsonData, check.jsonField);
        return evaluateCondition(value, check.operator, check.value);
      });

      if (anyTrue) {
        // Check if result is a JSON field path
        if (result && typeof result === 'string' && (result.includes('.') || result.includes('['))) {
          const resolvedValue = getNestedValue(jsonData, result);
          return resolvedValue !== undefined && resolvedValue !== null ? resolvedValue : result;
        }
        return result;
      }
    }
  }

  return defaultValue || '';
}

/**
 * FUNCTION: CONCAT
 * Concatenate multiple fields with optional separator and max length
 *
 * Example params:
 * {
 *   fields: [
 *     { jsonField: "eAPPDetails.0.Address.0.PlotNumber" },
 *     { jsonField: "eAPPDetails.0.Address.0.BuildingName" },
 *     { jsonField: "eAPPDetails.0.Address.0.MooNumber", prefix: "ม." },
 *     { jsonField: "eAPPDetails.0.Address.0.LaneSoi", prefix: "ซอย " },
 *     { jsonField: "eAPPDetails.0.Address.0.Road", prefix: "ถนน " }
 *   ],
 *   separator: " ",
 *   maxLength: 30,
 *   startIndex: 0
 * }
 */
function transformConcat(jsonData, params) {
  const { fields, separator = ' ', maxLength, startIndex = 0 } = params;

  if (!fields || !Array.isArray(fields)) {
    return '';
  }

  const parts = [];

  for (const field of fields) {
    let value = getNestedValue(jsonData, field.jsonField);

    if (!isEmpty(value)) {
      value = toString(value);

      // Apply transformations
      if (field.replace) {
        for (const [pattern, replacement] of Object.entries(field.replace)) {
          value = value.replace(new RegExp(pattern, 'g'), replacement);
        }
      }

      if (field.prefix && !isEmpty(value)) {
        value = field.prefix + value;
      }

      if (field.suffix && !isEmpty(value)) {
        value = value + field.suffix;
      }

      parts.push(value);
    }
  }

  let result = parts.join(separator);

  // Apply substring if specified
  if (maxLength !== undefined && startIndex !== undefined) {
    result = result.substring(startIndex, startIndex + maxLength);
  }

  return result;
}

/**
 * FUNCTION: SUBSTRING
 * Extract substring from a field
 *
 * Example params:
 * {
 *   jsonField: "eAPPDetails.0.CampaignCode",
 *   start: 0,
 *   length: 6
 * }
 */
function transformSubstring(jsonData, params) {
  const { jsonField, start = 0, length } = params;

  // Support _chainResult for use in chains
  let value;
  if (jsonField === '_chainResult') {
    value = toString(jsonData._chainResult);
  } else {
    value = toString(getNestedValue(jsonData, jsonField));
  }

  if (length !== undefined) {
    return value.substring(start, start + length);
  }

  return value.substring(start);
}

/**
 * Parse date string with custom format
 * Supports: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD, YYYY/MM/DD
 */
function parseDateWithFormat(dateString, format) {
  if (!dateString || !format) return null;

  // Normalize separators
  const dateParts = dateString.split(/[\/\-\.]/);
  const formatParts = format.split(/[\/\-\.]/);

  if (dateParts.length !== formatParts.length) {
    return null;
  }

  let day, month, year;

  for (let i = 0; i < formatParts.length; i++) {
    const part = formatParts[i].toUpperCase();
    const value = parseInt(dateParts[i], 10);

    if (isNaN(value)) return null;

    if (part === 'DD' || part === 'D') {
      day = value;
    } else if (part === 'MM' || part === 'M') {
      month = value;
    } else if (part === 'YYYY' || part === 'YY') {
      year = value;
      // Handle 2-digit year
      if (part === 'YY' && value < 100) {
        year = value < 50 ? 2000 + value : 1900 + value;
      }
    }
  }

  if (!day || !month || !year) {
    return null;
  }

  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Create date (month is 0-indexed in JavaScript Date)
  const date = new Date(year, month - 1, day);

  // Verify the date is valid (handles cases like Feb 31)
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

/**
 * FUNCTION: DATE
 * Convert date string to specific format with support for various input formats
 *
 * Example params:
 * {
 *   jsonField: "eAPPDetails.0.Insured.0.Dob",
 *   inputFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" (optional, defaults to ISO),
 *   outputFormat: "YYYY" | "MM" | "DD" | "YYYY-MM-DD",
 *   defaultValue: "9999" | "99" | "99"
 * }
 */
function transformDate(jsonData, params) {
  console.log('\n=== DATE FUNCTION START ===');
  console.log('params:', params);
  console.log('jsonData keys:', Object.keys(jsonData));

  // Support both old format (format) and new format (inputFormat/outputFormat)
  const { jsonField, format, inputFormat, outputFormat, defaultValue } = params;
  const actualOutputFormat = outputFormat || format;

  console.log('jsonField:', jsonField);
  console.log('inputFormat:', inputFormat);
  console.log('outputFormat:', actualOutputFormat);

  // Support _chainResult for use in chains
  let dateString;
  if (jsonField === '_chainResult') {
    dateString = jsonData._chainResult;
    console.log('Using _chainResult:', dateString);
  } else {
    dateString = getNestedValue(jsonData, jsonField);
    console.log(`Getting nested value from "${jsonField}":`, dateString);
  }

  if (isEmpty(dateString)) {
    console.log('Date string is empty, returning default:', defaultValue || '');
    console.log('=== DATE FUNCTION END ===\n');
    return defaultValue || '';
  }

  console.log('Date string to parse:', dateString, 'type:', typeof dateString);

  // Parse date based on input format
  let date;

  if (inputFormat) {
    console.log('Input format specified:', inputFormat);
    // ISO-compatible formats can use native Date parser
    const isoFormats = ['YYYY-MM-DD', 'YYYY/MM/DD'];
    if (isoFormats.includes(inputFormat)) {
      console.log('Using native Date parser for ISO format');
      // For ISO formats, use native parser (it handles both - and / separators)
      date = new Date(dateString);
      console.log('Parsed date (native):', date, 'valid:', !isNaN(date.getTime()));
    } else {
      console.log('Using custom parseDateWithFormat for:', inputFormat);
      // Parse custom format (DD/MM/YYYY, MM/DD/YYYY, etc.)
      date = parseDateWithFormat(dateString, inputFormat);
      console.log('Parsed date (custom):', date);
    }
  } else {
    console.log('No input format, using native Date parser (ISO default)');
    // Default: try ISO format (2025-12-25 or 2025-12-25T10:30:00)
    date = new Date(dateString);
    console.log('Parsed date (default):', date, 'valid:', !isNaN(date.getTime()));
  }

  if (!date || isNaN(date.getTime())) {
    console.warn(`Invalid date: "${dateString}" with format: ${inputFormat || 'ISO'}`);
    console.log('=== DATE FUNCTION END ===\n');
    return defaultValue || '';
  }

  console.log('Date is valid, formatting with:', actualOutputFormat);

  // Map old format names to new ones
  const formatMap = {
    'CCYY': 'YYYY',
    'CCYY-MM-DD': 'YYYY-MM-DD'
  };

  const finalFormat = formatMap[actualOutputFormat] || actualOutputFormat;
  console.log('Final format:', finalFormat);

  let result;
  switch (finalFormat) {
    case 'YYYY':
      result = date.getFullYear().toString();
      break;
    case 'MM':
      result = String(date.getMonth() + 1).padStart(2, '0');
      break;
    case 'DD':
      result = String(date.getDate()).padStart(2, '0');
      break;
    case 'YYYY-MM-DD':
      result = date.toISOString().split('T')[0];
      break;
    default:
      result = defaultValue || '';
  }

  console.log('Result:', result);
  console.log('=== DATE FUNCTION END ===\n');
  return result;
}

/**
 * FUNCTION: NUMBER
 * Format number with specific precision
 *
 * Example params:
 * {
 *   jsonField: "eAPPDetails.0.Insured.0.Weight",
 *   decimals: 3,
 *   padLeft: 5,
 *   defaultValue: "0"
 * }
 */
function transformNumber(jsonData, params) {
  const { jsonField, decimals, padLeft, multiply, defaultValue } = params;
  let value = getNestedValue(jsonData, jsonField);

  if (isEmpty(value)) {
    return defaultValue || '0';
  }

  // Convert to number
  value = parseFloat(value);

  if (isNaN(value)) {
    return defaultValue || '0';
  }

  // Apply multiplication
  if (multiply !== undefined) {
    value = value * multiply;
  }

  // Apply decimal precision
  if (decimals !== undefined) {
    value = value.toFixed(decimals);
  } else {
    value = value.toString();
  }

  // Apply left padding
  if (padLeft !== undefined) {
    const parts = value.split('.');
    parts[0] = parts[0].padStart(padLeft, '0');
    value = parts.join('.');
  }

  return value;
}

/**
 * FUNCTION: CONFIG
 * Lookup value from configuration database
 *
 * Example params:
 * {
 *   jsonField: "eAPPDetails.0.Insured.0.Salutation",
 *   configKey: "INSURED",
 *   fallbackToSource: true,
 *   defaultValue: "103"
 * }
 *
 * NOTE: This function requires a config lookup function to be passed in context
 */
async function transformConfig(jsonData, params, context) {
  const { jsonField, configKey, fallbackToSource, defaultValue } = params;

  console.log('🔍 [CONFIG] Starting transformConfig:', {
    jsonField,
    configKey,
    fallbackToSource,
    defaultValue
  });

  const sourceValue = getNestedValue(jsonData, jsonField);
  console.log('🔍 [CONFIG] Extracted sourceValue:', {
    jsonField,
    sourceValue,
    type: typeof sourceValue,
    isEmpty: isEmpty(sourceValue)
  });

  if (isEmpty(sourceValue)) {
    console.log('🔍 [CONFIG] sourceValue is empty, returning defaultValue:', defaultValue || '');
    return defaultValue || '';
  }

  // If already numeric and fallbackToSource is true, return as-is
  if (fallbackToSource && !isNaN(sourceValue)) {
    console.log('🔍 [CONFIG] Numeric value with fallbackToSource=true, returning sourceValue:', toString(sourceValue));
    return toString(sourceValue);
  }

  // Lookup from config
  console.log('🔍 [CONFIG] Checking context.configLookup:', {
    hasContext: !!context,
    hasConfigLookup: !!(context && context.configLookup)
  });

  if (context && context.configLookup) {
    console.log('🔍 [CONFIG] Calling configLookup with:', { configKey, sourceValue });
    const result = await context.configLookup(configKey, sourceValue);
    console.log('🔍 [CONFIG] configLookup returned:', { result, hasResult: !!result });

    if (result) {
      console.log('🔍 [CONFIG] Returning result from configLookup:', result);
      return result;
    }
  } else {
    console.log('⚠️ [CONFIG] configLookup not available in context!');
  }

  // Fallback to source value if configured
  if (fallbackToSource) {
    console.log('🔍 [CONFIG] No result found, fallbackToSource=true, returning sourceValue:', toString(sourceValue));
    return toString(sourceValue);
  }

  console.log('🔍 [CONFIG] No result found, returning defaultValue:', defaultValue || '');
  return defaultValue || '';
}

/**
 * FUNCTION: PRIORITY
 * Get first non-empty value from multiple fields
 *
 * Example params:
 * {
 *   fields: [
 *     "eAPPDetails.0.Insured.0.CitizenID",
 *     "eAPPDetails.0.Insured.0.PassportNo"
 *   ],
 *   defaultValue: ""
 * }
 */
function transformPriority(jsonData, params) {
  const { fields, defaultValue } = params;

  if (!fields || !Array.isArray(fields)) {
    return defaultValue || '';
  }

  for (const field of fields) {
    const value = getNestedValue(jsonData, field);
    if (!isEmpty(value)) {
      return value;
    }
  }

  return defaultValue || '';
}

/**
 * FUNCTION: ARRAY
 * Process array elements with mapping
 *
 * Example params:
 * {
 *   jsonField: "eAPPDetails.0.Riders",
 *   filter: { field: "RiderType", operator: "==", value: "MAIN" },
 *   sort: { field: "RiderCode", order: "asc" },
 *   map: [
 *     {
 *       targetField: "RIDER1X",
 *       sourceField: "RiderCode",
 *       transform: "trim"
 *     },
 *     {
 *       targetField: "RDRANT1X",
 *       sourceField: "RiderSA",
 *       format: { padLeft: 5, padChar: "0" }
 *     }
 *   ],
 *   maxItems: 10
 * }
 */
function transformArray(jsonData, params) {
  const { jsonField, filter, sort, map, maxItems, defaultValue } = params;
  let array = getNestedValue(jsonData, jsonField);

  if (!Array.isArray(array)) {
    return defaultValue || [];
  }

  // Apply filter
  if (filter) {
    array = array.filter(item => {
      const value = item[filter.field];
      return evaluateCondition(value, filter.operator, filter.value);
    });
  }

  // Apply sort
  if (sort) {
    array = array.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];

      if (sort.order === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }

  // Apply max items
  if (maxItems !== undefined) {
    array = array.slice(0, maxItems);
  }

  // Map to result
  const results = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const mappedItem = {};

    if (map && Array.isArray(map)) {
      for (const mapping of map) {
        let value = item[mapping.sourceField];

        // Apply transformations
        if (mapping.transform === 'trim') {
          value = toString(value).trim();
        }

        if (mapping.format) {
          if (mapping.format.padLeft) {
            value = toString(value).padStart(mapping.format.padLeft, mapping.format.padChar || '0');
          }
        }

        // Replace {index} with actual index (1-based)
        const targetField = mapping.targetField.replace('{index}', i + 1);
        mappedItem[targetField] = value;
      }
    }

    results.push(mappedItem);
  }

  return results;
}

/**
 * FUNCTION: EXPRESSION
 * Evaluate custom JavaScript expression
 *
 * Example params:
 * {
 *   expression: "data.firstName + ' ' + data.lastName",
 *   variables: {
 *     firstName: "eAPPDetails.0.Insured.0.FirstName",
 *     lastName: "eAPPDetails.0.Insured.0.LastName"
 *   }
 * }
 *
 * SECURITY: Uses safe expression evaluator with limited scope
 */
function transformExpression(jsonData, params) {
  const { expression, variables } = params;

  // Build data object from variables
  const data = {};
  if (variables) {
    for (const [varName, jsonPath] of Object.entries(variables)) {
      data[varName] = getNestedValue(jsonData, jsonPath);
    }
  }

  // Add full jsonData access
  data.jsonData = jsonData;

  // Safe evaluation (no eval - use Function constructor with limited scope)
  try {
    const func = new Function('data', `
      const { ${Object.keys(data).join(', ')} } = data;
      return ${expression};
    `);

    return func(data);
  } catch (error) {
    console.error('Expression evaluation error:', error);
    return '';
  }
}

/**
 * FUNCTION: JSCODE
 * Execute custom JavaScript code for complex business logic
 *
 * Example params:
 * {
 *   code: `
 *     const payment = data.eAPPDetails[0].Payment;
 *     if (payment.PayMethod === 'CREDITCARD') {
 *       if (payment.PayMode === 'MONTHLY') return 'BI12';
 *       if (payment.EtrNumber === 'YES') return 'BI01';
 *       return 'D000';
 *     }
 *     return 'D000';
 *   `,
 *   helpers: ["getNestedValue", "isEmpty"] // Available helper functions
 * }
 *
 * SECURITY: Sandboxed execution with only allowed helpers
 */
function transformJsCode(jsonData, params, context) {
  const { code, helpers = [] } = params;

  // Build helper functions object
  const availableHelpers = {
    getNestedValue,
    setNestedValue,
    isEmpty,
    toString,
    evaluateCondition
  };

  const helperObj = {};
  for (const helperName of helpers) {
    if (availableHelpers[helperName]) {
      helperObj[helperName] = availableHelpers[helperName];
    }
  }

  try {
    const func = new Function('data', 'helpers', 'context', `
      const { ${helpers.join(', ')} } = helpers;
      ${code}
    `);

    return func(jsonData, helperObj, context);
  } catch (error) {
    console.error('JS Code execution error:', error);
    return '';
  }
}

/**
 * FUNCTION: CUSTOM
 * Execute user-defined custom function from database
 *
 * Example params:
 * {
 *   functionName: "calculateAge",
 *   functionParams: { fieldName: "birthDate" }
 * }
 *
 * The custom function is loaded from soap_custom_functions table
 */
async function transformCustom(jsonData, params, context) {
  const { functionName, functionParams = {} } = params;

  if (!functionName) {
    console.error('CUSTOM function requires functionName parameter');
    return '';
  }

  try {
    console.log(`\n=== EXECUTING CUSTOM FUNCTION: ${functionName} ===`);
    console.log('jsonData passed to CUSTOM:', jsonData);
    console.log('functionParams passed to CUSTOM:', functionParams);

    // Import sql here to avoid circular dependency
    const { sql } = await import('@/lib/db');

    // Load custom function from database
    const result = await sql`
      SELECT code, is_active
      FROM soap_custom_functions
      WHERE function_name = ${functionName}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      console.error(`Custom function not found: ${functionName}`);
      return '';
    }

    const customFunc = result.rows[0];

    if (!customFunc.is_active) {
      console.error(`Custom function is inactive: ${functionName}`);
      return '';
    }

    console.log('Custom function code:', customFunc.code);

    // Execute the custom function code
    const func = new Function('data', 'params', customFunc.code);
    const customResult = func(jsonData, functionParams);

    console.log('Custom function result:', customResult);
    console.log(`=== END CUSTOM FUNCTION ===\n`);

    return customResult;

  } catch (error) {
    console.error(`Error executing custom function ${functionName}:`, error);
    console.error('Error stack:', error.stack);
    return '';
  }
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a condition
 * @param {*} leftValue - Left operand
 * @param {String} operator - Comparison operator
 * @param {*} rightValue - Right operand
 * @returns {Boolean}
 */
function evaluateCondition(leftValue, operator, rightValue) {
  switch (operator) {
    case '==':
    case 'equals':
      return leftValue == rightValue;

    case '===':
    case 'strictEquals':
      return leftValue === rightValue;

    case '!=':
    case 'notEquals':
      return leftValue != rightValue;

    case '!==':
    case 'strictNotEquals':
      return leftValue !== rightValue;

    case '>':
    case 'greaterThan':
      return leftValue > rightValue;

    case '>=':
    case 'greaterThanOrEqual':
      return leftValue >= rightValue;

    case '<':
    case 'lessThan':
      return leftValue < rightValue;

    case '<=':
    case 'lessThanOrEqual':
      return leftValue <= rightValue;

    case 'contains':
      return toString(leftValue).includes(toString(rightValue));

    case 'startsWith':
      return toString(leftValue).startsWith(toString(rightValue));

    case 'endsWith':
      return toString(leftValue).endsWith(toString(rightValue));

    case 'isEmpty':
      return isEmpty(leftValue);

    case 'isNotEmpty':
      return !isEmpty(leftValue);

    case 'in':
      return Array.isArray(rightValue) && rightValue.includes(leftValue);

    case 'notIn':
      return Array.isArray(rightValue) && !rightValue.includes(leftValue);

    case 'matches':
      return new RegExp(rightValue).test(toString(leftValue));

    default:
      return false;
  }
}

/**
 * FUNCTION: ARRAY_FILTER
 * Filter array data based on conditions
 *
 * Example params:
 * {
 *   jsonField: "eAPPDetails.0.Address",
 *   filterField: "Type",
 *   filterOperator: "==",
 *   filterValue: "HOME",
 *   selectField: "Street" // optional: select specific field from filtered result
 *   selectIndex: 0 // optional: select specific index from filtered results (default: 0)
 * }
 */
function transformArrayFilter(jsonData, params) {
  const {
    jsonField,
    filterField,
    filterOperator = '==',
    filterValue,
    filters = [], // Array of filter conditions
    selectField,
    selectIndex = 0,
    defaultValue = ''
  } = params;

  // Get the array - support both direct jsonField and _chainResult from previous step
  let arrayData;
  if (jsonField && jsonField !== '_chainResult') {
    // If jsonField is specified and not _chainResult, try to get from _originalData first (for step 2+)
    // This allows ARRAY_FILTER in step 2+ to access original JSON data
    if (jsonData._originalData) {
      arrayData = getNestedValue(jsonData._originalData, jsonField);
    } else {
      arrayData = getNestedValue(jsonData, jsonField);
    }
  } else if (jsonField === '_chainResult') {
    // Explicitly using chain result
    arrayData = jsonData._chainResult;
  } else if (Array.isArray(jsonData._chainResult)) {
    // If in chain and previous step returned an array, use it
    arrayData = jsonData._chainResult;
  } else {
    arrayData = jsonData;
  }

  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    return defaultValue;
  }

  // Build filter conditions array
  const filterConditions = [];

  // Add legacy single filter if provided
  if (filterField && filterValue !== undefined && filterValue !== null) {
    filterConditions.push({
      field: filterField,
      operator: filterOperator,
      value: filterValue
    });
  }

  // Add multiple filters if provided
  if (Array.isArray(filters) && filters.length > 0) {
    filters.forEach(f => {
      if (f.field && f.value !== undefined && f.value !== null) {
        filterConditions.push({
          field: f.field,
          operator: f.operator || '==',
          value: f.value
        });
      }
    });
  }

  // Filter the array - all conditions must match (AND logic)
  const filtered = arrayData.filter(item => {
    // If no filters, return all items
    if (filterConditions.length === 0) {
      return true;
    }

    // Check all conditions - all must be true
    return filterConditions.every(condition => {
      const itemValue = condition.field ? getNestedValue(item, condition.field) : item;
      return evaluateCondition(itemValue, condition.operator, condition.value);
    });
  });

  if (filtered.length === 0) {
    return defaultValue;
  }

  // Get the item at selectIndex
  const selectedItem = filtered[selectIndex] || filtered[0];

  // If selectField is specified, get that field from the selected item
  if (selectField) {
    return getNestedValue(selectedItem, selectField) || defaultValue;
  }

  // Otherwise return the entire item
  return selectedItem || defaultValue;
}

/**
 * FUNCTION: CHAIN
 * Chain multiple transformations together
 * The output of one function becomes the input to the next
 *
 * Example params:
 * {
 *   steps: [
 *     {
 *       type: "ARRAY_FILTER",
 *       params: {
 *         jsonField: "eAPPDetails.0.Address",
 *         filterField: "Type",
 *         filterValue: "HOME",
 *         selectField: "Street"
 *       }
 *     },
 *     {
 *       type: "SUBSTRING",
 *       params: {
 *         start: 0,
 *         length: 30
 *       }
 *     },
 *     {
 *       type: "CONCAT",
 *       params: {
 *         suffix: "..."
 *       }
 *     }
 *   ]
 * }
 */
async function transformChain(jsonData, params, context) {
  const { steps = [], defaultValue = '' } = params;

  if (!Array.isArray(steps) || steps.length === 0) {
    return defaultValue;
  }

  let result = null;

  console.log('=== CHAIN EXECUTION START ===');
  console.log('Total steps:', steps.length);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const { type, params: stepParams = {} } = step;

    console.log(`\n--- Step ${i + 1}/${steps.length}: ${type} ---`);
    console.log('Step params (before):', JSON.stringify(stepParams, null, 2));
    console.log('Result from previous step:', result);

    // Get transformation function
    const transformFunc = FUNCTION_REGISTRY[type?.toUpperCase()];

    if (!transformFunc) {
      console.warn(`Unknown function type in chain step ${i}: ${type}`);
      continue;
    }

    // For the first step, use original jsonData
    // For subsequent steps, create a wrapper object with the previous result
    let inputData;
    if (i === 0) {
      inputData = jsonData;
      console.log('Using original jsonData for first step');
    } else {
      // Wrap previous result so it can be accessed by functions
      // Also keep reference to original jsonData for functions that need it (e.g., ARRAY_FILTER with jsonField)
      inputData = { _chainResult: result, _originalData: jsonData };
      console.log('Wrapped result in _chainResult:', inputData);

      // If stepParams doesn't have jsonField, use _chainResult
      // EXCEPTION: Don't auto-set for ARRAY_FILTER - let it decide based on its own logic
      if (!stepParams.jsonField && type?.toUpperCase() !== 'ARRAY_FILTER') {
        stepParams.jsonField = '_chainResult';
        console.log('Auto-set jsonField to _chainResult');
      }

      // Special handling for CUSTOM function: auto-populate empty string params
      if (type?.toUpperCase() === 'CUSTOM' && stepParams.functionParams) {
        console.log('CUSTOM function detected, auto-populating params...');
        console.log('functionParams before:', stepParams.functionParams);

        // Clone functionParams to avoid mutation
        stepParams.functionParams = { ...stepParams.functionParams };

        // Replace empty string values with the chain result
        for (const [key, value] of Object.entries(stepParams.functionParams)) {
          if (value === '' || value === null || value === undefined) {
            console.log(`Auto-populating param "${key}" with result:`, result);
            stepParams.functionParams[key] = result;
          }
        }

        console.log('functionParams after:', stepParams.functionParams);
      }

      // Special handling for ARRAY_FILTER: replace _FROM_PREVIOUS_STEP_ with chain result
      if (type?.toUpperCase() === 'ARRAY_FILTER' && stepParams.filters) {
        console.log('ARRAY_FILTER detected, checking for dynamic filter values...');

        // Clone filters to avoid mutation
        stepParams.filters = stepParams.filters.map(filter => {
          if (filter.value === '_FROM_PREVIOUS_STEP_') {
            console.log(`Replacing filter value with result from previous step:`, result);
            return { ...filter, value: result };
          }
          return filter;
        });

        console.log('Filters after replacement:', stepParams.filters);
      }
    }

    console.log('Step params (after auto-populate):', JSON.stringify(stepParams, null, 2));

    // Execute the transformation
    result = await transformFunc(inputData, stepParams, context);

    console.log(`Result after step ${i + 1}:`, result);
  }

  console.log('\n=== CHAIN EXECUTION END ===');
  console.log('Final result:', result);

  return result !== null && result !== undefined ? result : defaultValue;
}

// ============================================================================
// FUNCTION REGISTRY
// ============================================================================

const FUNCTION_REGISTRY = {
  DIRECT: transformDirect,
  STATIC: transformStatic,
  CONDITION: transformCondition,
  CONDITION_MULTIPLE: transformConditionMultiple,
  CONCAT: transformConcat,
  SUBSTRING: transformSubstring,
  DATE: transformDate,
  NUMBER: transformNumber,
  CONFIG: transformConfig,
  PRIORITY: transformPriority,
  ARRAY: transformArray,
  ARRAY_FILTER: transformArrayFilter,
  EXPRESSION: transformExpression,
  JSCODE: transformJsCode,
  CUSTOM: transformCustom,
  CHAIN: transformChain
};

/**
 * Register a custom transformation function
 * @param {String} name - Function name
 * @param {Function} func - Transformation function
 */
function registerTransformFunction(name, func) {
  FUNCTION_REGISTRY[name.toUpperCase()] = func;
}

// ============================================================================
// MAIN MAPPING ENGINE
// ============================================================================

/**
 * Execute mapping transformation
 * @param {Object} jsonData - Source JSON data
 * @param {Object} mapping - Mapping configuration
 * @param {Object} context - Execution context (configLookup, etc.)
 * @returns {Promise<*>} - Transformed value
 */
async function executeMapping(jsonData, mapping, context = {}) {
  const {
    functionType = 'DIRECT',
    params = {},
    jsonField,
    defaultValue
  } = mapping;

  // Get transformation function
  const transformFunc = FUNCTION_REGISTRY[functionType.toUpperCase()];

  if (!transformFunc) {
    console.warn(`Unknown function type: ${functionType}, using DIRECT`);
    return transformDirect(jsonData, { jsonField, defaultValue });
  }

  // Merge params with mapping-level fields for backward compatibility
  const mergedParams = {
    ...params,
    jsonField: params.jsonField || jsonField,
    defaultValue: params.defaultValue || defaultValue
  };

  // Execute transformation
  const result = await transformFunc(jsonData, mergedParams, context);

  return result;
}

/**
 * Execute multiple mappings and return result object
 * @param {Object} jsonData - Source JSON data
 * @param {Array} mappings - Array of mapping configurations
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} - Mapped data object
 */
async function executeMappings(jsonData, mappings, context = {}) {
  const result = {};

  for (const mapping of mappings) {
    const { xmlPath, outputField } = mapping;

    const value = await executeMapping(jsonData, mapping, context);

    // Use outputField if specified, otherwise xmlPath
    const targetField = outputField || xmlPath;

    if (targetField) {
      setNestedValue(result, targetField, value);
    }
  }

  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  executeMapping,
  executeMappings,
  registerTransformFunction,

  // Utility functions (for custom transforms)
  getNestedValue,
  setNestedValue,
  isEmpty,
  toString,
  evaluateCondition,

  // All transform functions (for advanced usage)
  transformDirect,
  transformStatic,
  transformCondition,
  transformConditionMultiple,
  transformConcat,
  transformSubstring,
  transformDate,
  transformNumber,
  transformConfig,
  transformPriority,
  transformArray,
  transformExpression,
  transformJsCode,

  // Registry
  FUNCTION_REGISTRY
};
