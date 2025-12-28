'use client'

import { useState, useEffect } from 'react'
import ChainBuilder from './ChainBuilder'

const FUNCTION_TYPES = [
  { value: 'DIRECT', label: 'Direct - Simple field mapping', description: 'Map JSON field directly to XML' },
  { value: 'STATIC', label: 'Static - Fixed value', description: 'Use a static/default value' },
  { value: 'CONDITION', label: 'Condition - If-else logic', description: 'Conditional value based on field' },
  { value: 'CONDITION_MULTIPLE', label: 'Multiple Conditions', description: 'Multiple if-else conditions' },
  { value: 'CONCAT', label: 'Concat - Join strings', description: 'Concatenate multiple fields' },
  { value: 'SUBSTRING', label: 'Substring - Extract text', description: 'Extract part of string' },
  { value: 'DATE', label: 'Date - Format dates', description: 'Transform date formats' },
  { value: 'NUMBER', label: 'Number - Format numbers', description: 'Format numbers with precision' },
  { value: 'CONFIG', label: 'Config - Database lookup', description: 'Lookup from config table' },
  { value: 'PRIORITY', label: 'Priority - First non-empty', description: 'First available value' },
  { value: 'ARRAY', label: 'Array - Array operations', description: 'Join, filter, map arrays' },
  { value: 'ARRAY_FILTER', label: 'Array Filter - Filter array data', description: 'Filter array by condition and select field' },
  { value: 'EXPRESSION', label: 'Expression - Dynamic eval', description: 'Evaluate expressions' },
  { value: 'JSCODE', label: 'JS Code - Inline code', description: 'Execute JavaScript code' },
  { value: 'CUSTOM', label: 'Custom - User function', description: 'Use custom function from database' },
  { value: 'CHAIN', label: 'Chain - Multiple functions', description: 'Chain multiple transformations together' }
]

export default function MappingForm({
  selectedNode,
  existingMapping,
  onSave,
  onCancel
}) {
  const [functionType, setFunctionType] = useState('DIRECT')
  const [jsonField, setJsonField] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [functionParams, setFunctionParams] = useState({})
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [showParamsHelper, setShowParamsHelper] = useState(false)
  const [customFunctions, setCustomFunctions] = useState([])
  const [selectedFunction, setSelectedFunction] = useState(null)

  // Load custom functions on mount
  useEffect(() => {
    loadCustomFunctions()
  }, [])

  const loadCustomFunctions = async () => {
    try {
      const res = await fetch('/api/functions')
      const data = await res.json()
      console.log('Custom functions loaded:', data)
      if (data.success) {
        setCustomFunctions(data.data || [])
        console.log('Custom functions set:', data.data)
      }
    } catch (error) {
      console.error('Error loading custom functions:', error)
    }
  }

  useEffect(() => {
    if (existingMapping) {
      // Editing existing mapping
      setFunctionType(existingMapping.function_type || 'DIRECT')
      setJsonField(existingMapping.json_field || '')
      setDefaultValue(existingMapping.default_value || '')
      setDescription(existingMapping.description || '')
      setIsActive(existingMapping.is_active !== false)

      // Parse function_params
      if (existingMapping.function_params) {
        const params = typeof existingMapping.function_params === 'string'
          ? JSON.parse(existingMapping.function_params)
          : existingMapping.function_params
        setFunctionParams(params)

        // If it's a CUSTOM function, find the selected function
        if (existingMapping.function_type === 'CUSTOM' && params.functionName) {
          const func = customFunctions.find(f => f.function_name === params.functionName)
          setSelectedFunction(func || null)
        }
      }
    } else if (selectedNode?.templateMapping) {
      // New mapping, but has template mapping to use as default
      const tm = selectedNode.templateMapping
      setFunctionType(tm.function_type || 'DIRECT')
      setJsonField(tm.json_field || '')
      setDefaultValue(tm.default_value || '')
      setDescription(tm.description || '')
      setIsActive(true)

      // Parse template function_params
      if (tm.function_params) {
        const params = typeof tm.function_params === 'string'
          ? JSON.parse(tm.function_params)
          : tm.function_params
        setFunctionParams(params)

        // If it's a CUSTOM function, find the selected function
        if (tm.function_type === 'CUSTOM' && params.functionName) {
          const func = customFunctions.find(f => f.function_name === params.functionName)
          setSelectedFunction(func || null)
        }
      }
    } else {
      // Reset for new mapping without template
      setFunctionType('DIRECT')
      setJsonField('')
      setDefaultValue('')
      setFunctionParams({})
      setDescription('')
      setIsActive(true)
      setSelectedFunction(null)
    }
  }, [existingMapping, selectedNode, customFunctions])

  const handleSubmit = () => {
    if (!jsonField && !defaultValue && functionType === 'DIRECT') {
      alert('กรุณาระบุ JSON field หรือ Default value อย่างน้อย 1 อย่าง')
      return
    }

    // Validate CUSTOM function
    if (functionType === 'CUSTOM') {
      if (!functionParams.functionName) {
        alert('กรุณาเลือก Custom Function')
        return
      }
    }

    const mapping = {
      xml_path: selectedNode.path,
      xml_name: selectedNode.name,
      json_field: jsonField || null,
      xml_type: selectedNode.type,
      is_required: selectedNode.required,
      default_value: defaultValue || null,
      function_type: functionType,
      function_params: functionParams,
      description,
      is_active: isActive
    }

    onSave(mapping)
  }

  const getParamsTemplate = (type) => {
    const templates = {
      CONDITION: { jsonField: 'fieldName', operator: '==', compareValue: 'value', trueValue: 'result1', falseValue: 'result2' },
      CONDITION_MULTIPLE: { conditions: [{ jsonField: 'field', operator: '==', compareValue: 'val', result: 'output' }], defaultValue: 'default' },
      CONCAT: { fields: ['field1', 'field2'], separator: ' ' },
      SUBSTRING: { jsonField: 'field', start: 0, length: 10 },
      DATE: { jsonField: 'dateField', outputFormat: 'YYYY' },
      NUMBER: { jsonField: 'numberField', decimals: 2, thousandsSeparator: ',' },
      CONFIG: { jsonField: 'codeField', configKey: 'INSURED', fallbackToSource: false },
      PRIORITY: { fields: ['field1', 'field2', 'field3'] },
      ARRAY: { jsonField: 'arrayField', operation: 'join', separator: ', ' },
      ARRAY_FILTER: {
        jsonField: 'eAPPDetails.0.Address',
        filterField: 'Type',
        filterOperator: '==',
        filterValue: 'HOME',
        selectField: 'Street',
        selectIndex: 0
      },
      EXPRESSION: { expression: 'data.field1 + data.field2' },
      JSCODE: { code: 'return data.field;', helpers: [] },
      CUSTOM: { functionName: '', functionParams: {} },
      CHAIN: {
        steps: [
          {
            type: 'ARRAY_FILTER',
            params: {
              jsonField: 'eAPPDetails.0.Address',
              filterField: 'Type',
              filterValue: 'HOME',
              selectField: 'Street'
            }
          },
          {
            type: 'SUBSTRING',
            params: {
              start: 0,
              length: 30
            }
          }
        ]
      }
    }
    return templates[type] || {}
  }

  return (
    <div className="bg-white border border-black p-6">
      <h3 className="font-bold text-lg mb-4">
        {existingMapping ? 'Edit Mapping' : 'Add New Mapping'}
      </h3>

      <div className="space-y-4">
        {/* XML Field Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            XML Field
          </label>
          <div className="p-3 bg-gray-50 border border-gray-300 rounded">
            <div className="font-medium">{selectedNode.name}</div>
            <div className="text-xs text-gray-500 mt-1">{selectedNode.path}</div>
            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-1 text-xs rounded ${
                selectedNode.type === 'complex'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {selectedNode.type}
              </span>
              {selectedNode.required && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                  Required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Function Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Function Type <span className="text-red-600">*</span>
          </label>
          <select
            value={functionType}
            onChange={(e) => {
              setFunctionType(e.target.value)
              setFunctionParams(getParamsTemplate(e.target.value))
            }}
            className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
          >
            {FUNCTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {FUNCTION_TYPES.find(t => t.value === functionType)?.description}
          </p>
        </div>

        {/* JSON Field (for DIRECT and some others) */}
        {['DIRECT', 'STATIC'].includes(functionType) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JSON Field Path
            </label>
            <input
              type="text"
              value={jsonField}
              onChange={(e) => setJsonField(e.target.value)}
              placeholder="เช่น customer.name หรือ policy.number"
              className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              ใช้ dot notation สำหรับ nested fields (เว้นว่างถ้าใช้ default value อย่างเดียว)
            </p>
          </div>
        )}

        {/* DATE function fields */}
        {functionType === 'DATE' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.Insured.0.Dob"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Path ไปยังฟิลด์วันที่ใน JSON
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Format
              </label>
              <select
                value={functionParams.inputFormat || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, inputFormat: e.target.value })}
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Auto-detect (ISO format)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (เช่น 25/12/2025)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (เช่น 12/25/2025)</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY (เช่น 25-12-2025)</option>
                <option value="MM-DD-YYYY">MM-DD-YYYY (เช่น 12-25-2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (เช่น 2025-12-25)</option>
                <option value="YYYY/MM/DD">YYYY/MM/DD (เช่น 2025/12/25)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                รูปแบบวันที่ใน JSON (ถ้าไม่ระบุจะใช้ ISO format)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Format <span className="text-red-600">*</span>
              </label>
              <select
                value={functionParams.outputFormat || functionParams.format || ''}
                onChange={(e) => {
                  const newParams = { ...functionParams, outputFormat: e.target.value }
                  // Remove old 'format' param if exists
                  delete newParams.format
                  setFunctionParams(newParams)
                }}
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">-- เลือกรูปแบบ --</option>
                <option value="YYYY">YYYY - ปี 4 หลัก (เช่น 2025)</option>
                <option value="MM">MM - เดือน 2 หลัก (เช่น 01-12)</option>
                <option value="DD">DD - วันที่ 2 หลัก (เช่น 01-31)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD - รูปแบบ ISO (เช่น 2025-12-28)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                รูปแบบวันที่ที่ต้องการส่งออก
              </p>
            </div>
          </>
        )}

        {/* Default Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Value
          </label>
          <input
            type="text"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            placeholder="ค่าคงที่ที่ต้องการส่ง หรือค่า default"
            className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            ถ้าไม่มี JSON field จะใช้ค่านี้เสมอ / ถ้ามี JSON field จะใช้เมื่อ JSON ไม่มีข้อมูล
          </p>
        </div>

        {/* Custom Function Selector */}
        {functionType === 'CUSTOM' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Custom Function <span className="text-red-600">*</span>
            </label>
            {customFunctions.length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-xs mb-2">
                กำลังโหลด custom functions... ถ้าไม่มีให้ไปสร้างที่ <a href="/functions" className="text-blue-600 underline">/functions</a> ก่อน
              </div>
            )}
            <div className="mb-2 text-xs text-gray-600">
              Current functionParams: {JSON.stringify(functionParams)}
            </div>
            <select
              value={functionParams.functionName || ''}
              onChange={(e) => {
                const funcName = e.target.value
                console.log('========== CUSTOM FUNCTION SELECTED ==========')
                console.log('Selected function name:', funcName)
                console.log('Current functionParams before:', functionParams)
                console.log('Available custom functions:', customFunctions)
                const func = customFunctions.find(f => f.function_name === funcName)
                console.log('Found function:', func)
                setSelectedFunction(func || null)

                // Update function params
                const newParams = { functionName: funcName }
                if (func?.parameters) {
                  console.log('Function parameters:', func.parameters)
                  try {
                    // Parameters might be string or already parsed
                    const params = typeof func.parameters === 'string'
                      ? JSON.parse(func.parameters)
                      : func.parameters

                    console.log('Parsed parameters:', params)

                    // If parameters is an array of param definitions, create empty object
                    if (Array.isArray(params)) {
                      const paramsObj = {}
                      params.forEach(p => {
                        paramsObj[p.name] = p.default || ''
                      })
                      newParams.functionParams = paramsObj
                    } else {
                      newParams.functionParams = params
                    }
                  } catch (err) {
                    console.error('Error parsing parameters:', err)
                    newParams.functionParams = {}
                  }
                }
                console.log('Final params to set:', newParams)
                setFunctionParams(newParams)
                console.log('========== END ==========')
              }}
              className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">-- เลือก Function ({customFunctions.length} available) --</option>
              {customFunctions.map(func => (
                <option key={func.id} value={func.function_name}>
                  {func.function_name}
                  {func.description ? ` - ${func.description}` : ''}
                </option>
              ))}
            </select>

            {selectedFunction ? (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  Function: {selectedFunction.function_name}
                </div>
                {selectedFunction.description && (
                  <div className="text-xs text-blue-700 mb-2">
                    {selectedFunction.description}
                  </div>
                )}
                {selectedFunction.parameters ? (
                  <div className="text-xs">
                    <div className="font-medium text-blue-900 mb-1">รับ Parameters:</div>
                    <pre className="bg-white p-2 rounded border border-blue-300 overflow-auto">
                      {typeof selectedFunction.parameters === 'string'
                        ? selectedFunction.parameters
                        : JSON.stringify(selectedFunction.parameters, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">
                    ไม่รับ parameters
                  </div>
                )}
              </div>
            ) : functionParams.functionName ? (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                Loading function details...
              </div>
            ) : null}

            {/* Function Parameters Editor (if function has params) */}
            {selectedFunction && selectedFunction.parameters && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Function Parameters (JSON)
                </label>
                <textarea
                  value={JSON.stringify(functionParams.functionParams || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value)
                      setFunctionParams({
                        ...functionParams,
                        functionParams: params
                      })
                    } catch (err) {
                      // Invalid JSON
                    }
                  }}
                  placeholder='{}'
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  แก้ไข parameters ตามที่ function ต้องการ (must be valid JSON)
                </p>
              </div>
            )}
          </div>
        )}

        {/* SUBSTRING function fields */}
        {functionType === 'SUBSTRING' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.CampaignCode"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Position
                </label>
                <input
                  type="number"
                  value={functionParams.start ?? 0}
                  onChange={(e) => setFunctionParams({ ...functionParams, start: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">เริ่มที่ตำแหน่ง (0 = เริ่มต้น)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length
                </label>
                <input
                  type="number"
                  value={functionParams.length ?? ''}
                  onChange={(e) => setFunctionParams({ ...functionParams, length: parseInt(e.target.value) || undefined })}
                  placeholder="จำนวนตัวอักษร"
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนตัวอักษรที่ต้องการ</p>
              </div>
            </div>
          </>
        )}

        {/* NUMBER function fields */}
        {functionType === 'NUMBER' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.PremiumAmount"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decimal Places
                </label>
                <input
                  type="number"
                  value={functionParams.decimals ?? 2}
                  onChange={(e) => setFunctionParams({ ...functionParams, decimals: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนทศนิยม (เช่น 2 = 1.50)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thousands Separator
                </label>
                <select
                  value={functionParams.thousandsSeparator || ''}
                  onChange={(e) => setFunctionParams({ ...functionParams, thousandsSeparator: e.target.value })}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">None</option>
                  <option value=",">, (Comma)</option>
                  <option value=" ">  (Space)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">ตัวคั่นหลักพัน (เช่น 1,000)</p>
              </div>
            </div>
          </>
        )}

        {/* CONDITION function fields */}
        {functionType === 'CONDITION' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.PolicyStatus"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                value={functionParams.operator || '=='}
                onChange={(e) => setFunctionParams({ ...functionParams, operator: e.target.value })}
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="==">Equals (==)</option>
                <option value="!=">Not Equals (!=)</option>
                <option value=">">Greater Than (&gt;)</option>
                <option value="<">Less Than (&lt;)</option>
                <option value="contains">Contains</option>
                <option value="isEmpty">Is Empty</option>
              </select>
            </div>
            {functionParams.operator !== 'isEmpty' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compare Value
                </label>
                <input
                  type="text"
                  value={functionParams.compareValue || ''}
                  onChange={(e) => setFunctionParams({ ...functionParams, compareValue: e.target.value })}
                  placeholder="ค่าที่ใช้เปรียบเทียบ"
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                True Value (If condition matches)
              </label>
              <input
                type="text"
                value={functionParams.trueValue || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, trueValue: e.target.value })}
                placeholder="ค่าถ้าเงื่อนไขเป็นจริง"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                False Value (If condition doesn't match)
              </label>
              <input
                type="text"
                value={functionParams.falseValue || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, falseValue: e.target.value })}
                placeholder="ค่าถ้าเงื่อนไขเป็นเท็จ"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </>
        )}

        {/* CONFIG function fields */}
        {functionType === 'CONFIG' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.RelationType"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Field ที่มี code ที่ต้องการ lookup
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Config Key <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.configKey || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, configKey: e.target.value })}
                placeholder="เช่น INSURED, GENDER, etc."
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Config table key ที่ใช้ในการ lookup
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fallbackToSource"
                checked={functionParams.fallbackToSource || false}
                onChange={(e) => setFunctionParams({ ...functionParams, fallbackToSource: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="fallbackToSource" className="text-sm text-gray-700">
                Fallback to source value if not found in config
              </label>
            </div>
          </>
        )}

        {/* CONCAT function fields */}
        {functionType === 'CONCAT' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fields to Concatenate <span className="text-red-600">*</span>
              </label>
              <textarea
                value={(functionParams.fields || []).join('\n')}
                onChange={(e) => setFunctionParams({ ...functionParams, fields: e.target.value.split('\n').filter(f => f.trim()) })}
                placeholder="field1&#10;field2&#10;field3"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                ใส่ field paths ที่ต้องการ concat (แยกบรรทัด)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Separator
              </label>
              <input
                type="text"
                value={functionParams.separator ?? ' '}
                onChange={(e) => setFunctionParams({ ...functionParams, separator: e.target.value })}
                placeholder="ตัวคั่น (เช่น space, comma, etc.)"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                ตัวคั่นระหว่าง fields (default: space)
              </p>
            </div>
          </>
        )}

        {/* PRIORITY function fields */}
        {functionType === 'PRIORITY' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Priority (First to Last) <span className="text-red-600">*</span>
            </label>
            <textarea
              value={(functionParams.fields || []).join('\n')}
              onChange={(e) => setFunctionParams({ ...functionParams, fields: e.target.value.split('\n').filter(f => f.trim()) })}
              placeholder="field1&#10;field2&#10;field3"
              className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              ระบุ field paths ตามลำดับความสำคัญ (บรรทัดแรก = สำคัญที่สุด) - จะใช้ field แรกที่มีค่า
            </p>
          </div>
        )}

        {/* Chain Builder */}
        {functionType === 'CHAIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chain Steps Builder
            </label>
            <ChainBuilder
              value={functionParams}
              onChange={(value) => setFunctionParams(value)}
            />
          </div>
        )}

        {/* ARRAY_FILTER function fields */}
        {functionType === 'ARRAY_FILTER' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Array Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.Address"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Path ไปยัง array ที่ต้องการ filter
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Field <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.filterField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, filterField: e.target.value })}
                placeholder="เช่น Category_Addr หรือ Type"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Field ใน array item ที่ใช้ในการ filter
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Operator
                </label>
                <select
                  value={functionParams.filterOperator || '=='}
                  onChange={(e) => setFunctionParams({ ...functionParams, filterOperator: e.target.value })}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="==">Equals (==)</option>
                  <option value="!=">Not Equals (!=)</option>
                  <option value="contains">Contains</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Value <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={functionParams.filterValue || ''}
                  onChange={(e) => setFunctionParams({ ...functionParams, filterValue: e.target.value })}
                  placeholder="เช่น HOME, OFFICE"
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Field (Optional)
              </label>
              <input
                type="text"
                value={functionParams.selectField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, selectField: e.target.value })}
                placeholder="เช่น Street, PostalCode (เว้นว่างถ้าต้องการ object ทั้งหมด)"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Field ที่ต้องการเลือกจาก filtered items (เว้นว่างถ้าต้องการ object ทั้งหมด)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Index
              </label>
              <input
                type="number"
                value={functionParams.selectIndex ?? 0}
                onChange={(e) => setFunctionParams({ ...functionParams, selectIndex: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Index ของ item ที่ต้องการเลือก (0 = item แรก, 1 = item ที่สอง)
              </p>
            </div>
          </>
        )}

        {/* ARRAY function fields */}
        {functionType === 'ARRAY' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Array Field Path <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={functionParams.jsonField || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, jsonField: e.target.value })}
                placeholder="เช่น eAPPDetails.0.Riders"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Path ไปยัง array ที่ต้องการใช้งาน
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operation <span className="text-red-600">*</span>
              </label>
              <select
                value={functionParams.operation || 'join'}
                onChange={(e) => setFunctionParams({ ...functionParams, operation: e.target.value })}
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="join">Join - รวม array เป็น string</option>
                <option value="length">Length - นับจำนวน items</option>
                <option value="first">First - เลือก item แรก</option>
                <option value="last">Last - เลือก item สุดท้าย</option>
              </select>
            </div>
            {functionParams.operation === 'join' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Separator
                </label>
                <input
                  type="text"
                  value={functionParams.separator ?? ', '}
                  onChange={(e) => setFunctionParams({ ...functionParams, separator: e.target.value })}
                  placeholder="ตัวคั่น (เช่น , or ; or space)"
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ตัวคั่นระหว่าง items เมื่อ join (default: ", ")
                </p>
              </div>
            )}
          </>
        )}

        {/* CONDITION_MULTIPLE function fields */}
        {functionType === 'CONDITION_MULTIPLE' && (
          <div>
            <div className="mb-2 p-3 bg-blue-50 border border-blue-300 rounded">
              <div className="text-sm font-medium text-blue-900 mb-1">
                ℹ️ Multiple IF-ELSE Conditions
              </div>
              <p className="text-xs text-blue-700">
                ตรวจสอบเงื่อนไขหลายๆ อัน ตามลำดับ (if-else if-else if-else) เงื่อนไขแรกที่เป็นจริงจะถูกใช้
              </p>
            </div>

            {/* Conditions List */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Conditions (IF-ELSE IF)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const conditions = functionParams.conditions || []
                      setFunctionParams({
                        ...functionParams,
                        conditions: [...conditions, { jsonField: '', operator: '==', compareValue: '', result: '' }]
                      })
                    }}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Simple IF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const conditions = functionParams.conditions || []
                      setFunctionParams({
                        ...functionParams,
                        conditions: [...conditions, { type: 'AND', checks: [{ jsonField: '', operator: '==', value: '' }], result: '' }]
                      })
                    }}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add AND/OR Condition
                  </button>
                </div>
              </div>

              {(!functionParams.conditions || functionParams.conditions.length === 0) ? (
                <div className="p-3 bg-gray-50 border border-gray-300 rounded text-sm text-gray-600">
                  ไม่มี conditions (กด "+ Add Simple IF" สำหรับเงื่อนไขเดียว หรือ "+ Add AND/OR Condition" สำหรับหลายเงื่อนไข)
                </div>
              ) : (
                <div className="space-y-3">
                  {functionParams.conditions.map((condition, conditionIndex) => {
                    const isAndOr = condition.type === 'AND' || condition.type === 'OR';

                    return (
                      <div key={conditionIndex} className={`p-3 border rounded space-y-2 ${isAndOr ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {conditionIndex === 0 ? 'IF' : `ELSE IF ${conditionIndex}`}
                            {isAndOr && <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">{condition.type}</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const conditions = functionParams.conditions.filter((_, i) => i !== conditionIndex)
                              setFunctionParams({ ...functionParams, conditions })
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            ✕ Remove
                          </button>
                        </div>

                        {/* AND/OR Condition */}
                        {isAndOr ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Logic Type
                              </label>
                              <select
                                value={condition.type || 'AND'}
                                onChange={(e) => {
                                  const conditions = [...functionParams.conditions]
                                  conditions[conditionIndex] = { ...condition, type: e.target.value }
                                  setFunctionParams({ ...functionParams, conditions })
                                }}
                                className="w-full p-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                              >
                                <option value="AND">AND - ต้องเป็นจริงทุกเงื่อนไข</option>
                                <option value="OR">OR - เป็นจริงอย่างน้อย 1 เงื่อนไข</option>
                              </select>
                            </div>

                            <div className="flex justify-between items-center">
                              <label className="block text-xs font-medium text-gray-700">
                                Checks (เงื่อนไขย่อย)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const conditions = [...functionParams.conditions]
                                  const checks = condition.checks || []
                                  conditions[conditionIndex] = {
                                    ...condition,
                                    checks: [...checks, { jsonField: '', operator: '==', value: '' }]
                                  }
                                  setFunctionParams({ ...functionParams, conditions })
                                }}
                                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                + Add Check
                              </button>
                            </div>

                            {/* Checks */}
                            {(condition.checks || []).map((check, checkIndex) => (
                              <div key={checkIndex} className="p-2 bg-white border border-gray-300 rounded space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-gray-600">Check #{checkIndex + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const conditions = [...functionParams.conditions]
                                      const checks = condition.checks.filter((_, i) => i !== checkIndex)
                                      conditions[conditionIndex] = { ...condition, checks }
                                      setFunctionParams({ ...functionParams, conditions })
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">JSON Field Path</label>
                                  <input
                                    type="text"
                                    value={check.jsonField || ''}
                                    onChange={(e) => {
                                      const conditions = [...functionParams.conditions]
                                      const checks = [...condition.checks]
                                      checks[checkIndex] = { ...check, jsonField: e.target.value }
                                      conditions[conditionIndex] = { ...condition, checks }
                                      setFunctionParams({ ...functionParams, conditions })
                                    }}
                                    placeholder="เช่น eAPPDetails.0.Payer"
                                    className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Operator</label>
                                    <select
                                      value={check.operator || '=='}
                                      onChange={(e) => {
                                        const conditions = [...functionParams.conditions]
                                        const checks = [...condition.checks]
                                        checks[checkIndex] = { ...check, operator: e.target.value }
                                        conditions[conditionIndex] = { ...condition, checks }
                                        setFunctionParams({ ...functionParams, conditions })
                                      }}
                                      className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                      <option value="==">==</option>
                                      <option value="!=">!=</option>
                                      <option value=">">{'>'}</option>
                                      <option value="<">{'<'}</option>
                                      <option value="contains">contains</option>
                                      <option value="isEmpty">isEmpty</option>
                                    </select>
                                  </div>
                                  {check.operator !== 'isEmpty' && (
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">Value</label>
                                      <input
                                        type="text"
                                        value={check.value === null ? 'null' : (check.value || '')}
                                        onChange={(e) => {
                                          const conditions = [...functionParams.conditions]
                                          const checks = [...condition.checks]
                                          const val = e.target.value === 'null' ? null : e.target.value
                                          checks[checkIndex] = { ...check, value: val }
                                          conditions[conditionIndex] = { ...condition, checks }
                                          setFunctionParams({ ...functionParams, conditions })
                                        }}
                                        placeholder="ค่าเปรียบเทียบ (ใส่ 'null' สำหรับ null)"
                                        className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Result (ค่าที่ส่งกลับถ้าเงื่อนไขเป็นจริง) <span className="text-red-600">*</span>
                              </label>
                              <input
                                type="text"
                                value={condition.result || ''}
                                onChange={(e) => {
                                  const conditions = [...functionParams.conditions]
                                  conditions[conditionIndex] = { ...condition, result: e.target.value }
                                  setFunctionParams({ ...functionParams, conditions })
                                }}
                                placeholder="ค่าที่จะส่งกลับ"
                                className="w-full p-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>
                          </div>
                        ) : (
                          /* Simple Condition */
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                JSON Field Path <span className="text-red-600">*</span>
                              </label>
                              <input
                                type="text"
                                value={condition.jsonField || ''}
                                onChange={(e) => {
                                  const conditions = [...functionParams.conditions]
                                  conditions[conditionIndex] = { ...condition, jsonField: e.target.value }
                                  setFunctionParams({ ...functionParams, conditions })
                                }}
                                placeholder="เช่น eAPPDetails.0.Status"
                                className="w-full p-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Operator
                                </label>
                                <select
                                  value={condition.operator || '=='}
                                  onChange={(e) => {
                                    const conditions = [...functionParams.conditions]
                                    conditions[conditionIndex] = { ...condition, operator: e.target.value }
                                    setFunctionParams({ ...functionParams, conditions })
                                  }}
                                  className="w-full p-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                  <option value="==">Equals (==)</option>
                                  <option value="!=">Not Equals (!=)</option>
                                  <option value=">">Greater Than (&gt;)</option>
                                  <option value="<">Less Than (&lt;)</option>
                                  <option value="contains">Contains</option>
                                  <option value="isEmpty">Is Empty</option>
                                </select>
                              </div>
                              {condition.operator !== 'isEmpty' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Compare Value <span className="text-red-600">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={condition.compareValue || ''}
                                    onChange={(e) => {
                                      const conditions = [...functionParams.conditions]
                                      conditions[conditionIndex] = { ...condition, compareValue: e.target.value }
                                      setFunctionParams({ ...functionParams, conditions })
                                    }}
                                    placeholder="ค่าที่ใช้เปรียบเทียบ"
                                    className="w-full p-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Result (ค่าที่ส่งกลับถ้าเงื่อนไขนี้เป็นจริง) <span className="text-red-600">*</span>
                              </label>
                              <input
                                type="text"
                                value={condition.result || ''}
                                onChange={(e) => {
                                  const conditions = [...functionParams.conditions]
                                  conditions[conditionIndex] = { ...condition, result: e.target.value }
                                  setFunctionParams({ ...functionParams, conditions })
                                }}
                                placeholder="ค่าที่จะส่งกลับ"
                                className="w-full p-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Default Value (ELSE) */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Value (ELSE - ถ้าไม่มีเงื่อนไขไหนเป็นจริง)
              </label>
              <input
                type="text"
                value={functionParams.defaultValue || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, defaultValue: e.target.value })}
                placeholder="ค่าที่ส่งกลับถ้าไม่มีเงื่อนไขไหนเป็นจริง"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                ค่า default ที่จะส่งกลับถ้าไม่มีเงื่อนไขไหนเป็นจริงเลย (ELSE clause)
              </p>
            </div>
          </div>
        )}

        {/* EXPRESSION function fields */}
        {functionType === 'EXPRESSION' && (
          <div>
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-300 rounded">
              <div className="text-sm font-medium text-yellow-800 mb-1">
                ⚠️ Advanced Function Type
              </div>
              <p className="text-xs text-yellow-700">
                EXPRESSION ใช้ JavaScript expression ในการคำนวณค่า (เช่น data.field1 + data.field2)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expression <span className="text-red-600">*</span>
              </label>
              <textarea
                value={functionParams.expression || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, expression: e.target.value })}
                placeholder="data.field1 + data.field2&#10;data.price * 1.07&#10;data.firstName + ' ' + data.lastName"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                JavaScript expression ที่สามารถใช้ตัวแปร "data" เพื่อเข้าถึง JSON data
              </p>
            </div>
          </div>
        )}

        {/* JSCODE function fields */}
        {functionType === 'JSCODE' && (
          <div>
            <div className="mb-2 p-3 bg-red-50 border border-red-300 rounded">
              <div className="text-sm font-medium text-red-800 mb-1">
                ⚠️ Advanced Function Type - Use with Caution
              </div>
              <p className="text-xs text-red-700">
                JSCODE ให้คุณเขียน JavaScript code ได้เต็มรูปแบบ รวมถึง loops, conditions, และ functions
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JavaScript Code <span className="text-red-600">*</span>
              </label>
              <textarea
                value={functionParams.code || ''}
                onChange={(e) => setFunctionParams({ ...functionParams, code: e.target.value })}
                placeholder="// ใช้ตัวแปร data, params, และ helpers&#10;return data.field;"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                JavaScript code ที่จะถูก execute (ใช้ return เพื่อส่งค่ากลับ)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Helper Functions (Optional)
              </label>
              <textarea
                value={(functionParams.helpers || []).join('\n')}
                onChange={(e) => setFunctionParams({ ...functionParams, helpers: e.target.value.split('\n').filter(f => f.trim()) })}
                placeholder="helper1&#10;helper2"
                className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                ชื่อ helper functions ที่ต้องการใช้ (แยกบรรทัด)
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายการ map นี้"
            className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Is Active */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className="text-sm font-medium">Active</span>
          </label>
          <p className="text-xs text-gray-500 ml-6">
            Inactive mappings will be ignored during transformation
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-800"
          >
            {existingMapping ? 'Update Mapping' : 'Add Mapping'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-black hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
