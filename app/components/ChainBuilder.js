'use client'

import { useState, useEffect } from 'react'

const AVAILABLE_FUNCTIONS = [
  { value: 'DIRECT', label: 'Direct', description: 'Get field value', needsJsonField: true },
  { value: 'ARRAY_FILTER', label: 'Array Filter', description: 'Filter array by condition', needsJsonField: true },
  { value: 'ARRAY', label: 'Array Operations', description: 'Join, length, first, last', needsJsonField: true },
  { value: 'CUSTOM', label: 'Custom Function', description: 'Call custom function', needsJsonField: false },
  { value: 'SUBSTRING', label: 'Substring', description: 'Extract part of string', needsJsonField: false },
  { value: 'CONCAT', label: 'Concat', description: 'Join strings', needsJsonField: false },
  { value: 'DATE', label: 'Date Format', description: 'Format date', needsJsonField: false },
  { value: 'NUMBER', label: 'Number Format', description: 'Format number', needsJsonField: false },
  { value: 'CONFIG', label: 'Config Lookup', description: 'Database lookup', needsJsonField: false },
  { value: 'CONDITION', label: 'Condition', description: 'If-else logic', needsJsonField: false },
  { value: 'CONDITION_MULTIPLE', label: 'Multiple Conditions', description: 'Multiple if-else if-else', needsJsonField: false },
  { value: 'PRIORITY', label: 'Priority Fields', description: 'First non-empty field', needsJsonField: false },
  { value: 'EXPRESSION', label: 'Expression', description: 'JavaScript expression', needsJsonField: false },
  { value: 'JSCODE', label: 'JS Code', description: 'Full JavaScript code', needsJsonField: false }
]

export default function ChainBuilder({ value = { steps: [] }, onChange }) {
  const [steps, setSteps] = useState(value.steps || [])
  const [expandedStep, setExpandedStep] = useState(0)
  const [customFunctions, setCustomFunctions] = useState([])

  // Load custom functions on mount
  useEffect(() => {
    loadCustomFunctions()
  }, [])

  const loadCustomFunctions = async () => {
    try {
      const res = await fetch('/api/functions')
      const data = await res.json()
      if (data.success) {
        setCustomFunctions(data.data || [])
      }
    } catch (error) {
      console.error('Error loading custom functions:', error)
    }
  }

  useEffect(() => {
    if (value.steps) {
      setSteps(value.steps)
    }
  }, [value])

  const handleAddStep = () => {
    const newSteps = [...steps, { type: 'DIRECT', params: {} }]
    setSteps(newSteps)
    setExpandedStep(newSteps.length - 1)
    onChange({ steps: newSteps })
  }

  const handleRemoveStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps)
    onChange({ steps: newSteps })
  }

  const handleMoveStep = (index, direction) => {
    const newSteps = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex >= 0 && targetIndex < newSteps.length) {
      [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
      setSteps(newSteps)
      onChange({ steps: newSteps })
    }
  }

  const handleUpdateStep = (index, field, value) => {
    const newSteps = [...steps]
    if (field === 'type') {
      newSteps[index] = { type: value, params: {} }
    } else {
      newSteps[index] = {
        ...newSteps[index],
        [field]: value
      }
    }
    setSteps(newSteps)
    onChange({ steps: newSteps })
  }

  const handleUpdateParams = (index, params) => {
    const newSteps = [...steps]
    newSteps[index] = {
      ...newSteps[index],
      params: params
    }
    setSteps(newSteps)
    onChange({ steps: newSteps })
  }

  const getOutputDescription = (stepIndex) => {
    if (stepIndex === 0) {
      return 'จะใช้ข้อมูล JSON ต้นฉบับ'
    }

    const prevStep = steps[stepIndex - 1]
    const funcInfo = AVAILABLE_FUNCTIONS.find(f => f.value === prevStep?.type)

    if (!funcInfo) return 'ผลลัพธ์จาก step ก่อนหน้า'

    switch (prevStep.type) {
      case 'ARRAY_FILTER':
        if (prevStep.params?.selectField) {
          return `ค่า field "${prevStep.params.selectField}" (string/number)`
        }
        return 'Object ที่ filter ได้'
      case 'ARRAY':
        const op = prevStep.params?.operation || 'join'
        if (op === 'join') return 'String ที่รวมจาก array'
        if (op === 'length') return 'จำนวน items ใน array'
        if (op === 'first') return 'Item แรกของ array'
        if (op === 'last') return 'Item สุดท้ายของ array'
        return 'ผลลัพธ์จาก array operation'
      case 'CUSTOM':
        return `ผลลัพธ์จาก function "${prevStep.params?.functionName}"`
      case 'SUBSTRING':
        return 'String ที่ถูกตัด'
      case 'CONCAT':
        return 'String ที่ถูกรวม'
      case 'DATE':
        return 'Date string ที่ format แล้ว'
      case 'NUMBER':
        return 'Number ที่ format แล้ว'
      case 'CONFIG':
        return 'ค่าจาก config lookup'
      case 'CONDITION':
        return 'ค่าตามเงื่อนไข (true/false value)'
      case 'CONDITION_MULTIPLE':
        return 'ค่าตามเงื่อนไขที่เป็นจริงอันแรก'
      case 'PRIORITY':
        return 'ค่าจาก field แรกที่ไม่ว่าง'
      case 'EXPRESSION':
        return 'ผลลัพธ์จาก expression'
      case 'JSCODE':
        return 'ผลลัพธ์จาก custom code'
      case 'DIRECT':
        return 'ค่าจาก JSON field'
      default:
        return 'ผลลัพธ์จาก step ก่อนหน้า'
    }
  }

  const renderStepParams = (step, index) => {
    const params = step.params || {}
    const isFirstStep = index === 0
    const funcInfo = AVAILABLE_FUNCTIONS.find(f => f.value === step.type)

    const updateParam = (key, value) => {
      handleUpdateParams(index, { ...params, [key]: value })
    }

    // Helper: Check if this step needs jsonField parameter
    const needsJsonField = isFirstStep && funcInfo?.needsJsonField

    // For steps after the first, show info that input comes from previous step
    const showInputInfo = !isFirstStep && (
      step.type === 'SUBSTRING' ||
      step.type === 'CONCAT' ||
      step.type === 'DATE' ||
      step.type === 'NUMBER' ||
      step.type === 'CONFIG' ||
      step.type === 'CONDITION' ||
      step.type === 'CONDITION_MULTIPLE' ||
      step.type === 'ARRAY' ||
      step.type === 'EXPRESSION' ||
      step.type === 'JSCODE' ||
      step.type === 'CUSTOM'
    )

    switch (step.type) {
      case 'DIRECT':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                JSON Field Path
              </label>
              <input
                type="text"
                value={params.jsonField || ''}
                onChange={(e) => updateParam('jsonField', e.target.value)}
                placeholder="เช่น eAPPDetails.0.Insured.0.Name"
                className="w-full p-2 border border-gray-300 text-sm"
              />
            </div>
          </div>
        )

      case 'ARRAY_FILTER':
        const filters = params.filters || []

        return (
          <div className="space-y-2">
            {!isFirstStep && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ สามารถเลือกได้ว่าจะใช้ array จากไหน
                </div>
                <div className="text-yellow-700 mt-1">
                  • เว้นว่าง = ใช้ผลจาก step ก่อนหน้า (ถ้าเป็น array)<br/>
                  • ระบุ path = ใช้ array จาก JSON ต้นฉบับ
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                JSON Array Path {isFirstStep && <span className="text-red-600">*</span>}
                {!isFirstStep && <span className="text-gray-500 text-xs ml-1">(optional - เว้นว่างถ้าใช้ผลจาก step ก่อนหน้า)</span>}
              </label>
              <input
                type="text"
                value={params.jsonField || ''}
                onChange={(e) => updateParam('jsonField', e.target.value)}
                placeholder={isFirstStep ? "เช่น eAPPDetails.0.Address" : "เช่น eAPPDetails.0.Address (หรือเว้นว่าง)"}
                className="w-full p-2 border border-gray-300 text-sm"
              />
            </div>

            {/* Multiple Filter Conditions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-700">
                  Filter Conditions (AND logic)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newFilters = [...filters, { field: '', operator: '==', value: '', useChainResult: false }]
                    updateParam('filters', newFilters)
                  }}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Add Filter
                </button>
              </div>

              {filters.length === 0 ? (
                <div className="p-3 bg-gray-50 border border-gray-300 rounded text-xs text-gray-600">
                  ไม่มี filter conditions (จะได้ทุก item ใน array)
                </div>
              ) : (
                <div className="space-y-2">
                  {filters.map((filter, filterIndex) => (
                    <div key={filterIndex} className="p-2 bg-gray-50 border border-gray-300 rounded space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">Filter #{filterIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFilters = filters.filter((_, i) => i !== filterIndex)
                            updateParam('filters', newFilters)
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          ✕ Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Field</label>
                          <input
                            type="text"
                            value={filter.field || ''}
                            onChange={(e) => {
                              const newFilters = [...filters]
                              newFilters[filterIndex] = { ...filter, field: e.target.value }
                              updateParam('filters', newFilters)
                            }}
                            placeholder="เช่น Category_Addr"
                            className="w-full p-1 border border-gray-300 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Operator</label>
                          <select
                            value={filter.operator || '=='}
                            onChange={(e) => {
                              const newFilters = [...filters]
                              newFilters[filterIndex] = { ...filter, operator: e.target.value }
                              updateParam('filters', newFilters)
                            }}
                            className="w-full p-1 border border-gray-300 text-xs"
                          >
                            <option value="==">==</option>
                            <option value="!=">!=</option>
                            <option value=">">{'>'}</option>
                            <option value="<">{'<'}</option>
                            <option value="contains">contains</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Value</label>
                          <input
                            type="text"
                            value={filter.value || ''}
                            onChange={(e) => {
                              const newFilters = [...filters]
                              newFilters[filterIndex] = { ...filter, value: e.target.value }
                              updateParam('filters', newFilters)
                            }}
                            placeholder="เช่น INSURED"
                            className="w-full p-1 border border-gray-300 text-xs"
                            disabled={filter.useChainResult}
                          />
                        </div>
                      </div>
                      {!isFirstStep && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`useChainResult-${filterIndex}`}
                            checked={filter.useChainResult || false}
                            onChange={(e) => {
                              const newFilters = [...filters]
                              newFilters[filterIndex] = {
                                ...filter,
                                useChainResult: e.target.checked,
                                value: e.target.checked ? '_FROM_PREVIOUS_STEP_' : ''
                              }
                              updateParam('filters', newFilters)
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`useChainResult-${filterIndex}`} className="text-xs text-blue-700">
                            ใช้ค่าจาก step ก่อนหน้าเป็น filter value
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Field (optional)
              </label>
              <input
                type="text"
                value={params.selectField || ''}
                onChange={(e) => updateParam('selectField', e.target.value)}
                placeholder="เว้นว่าง = ได้ทั้ง object"
                className="w-full p-2 border border-gray-300 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                ถ้าไม่ระบุ จะได้ทั้ง object ที่ filter ได้
              </p>
            </div>
          </div>
        )

      case 'SUBSTRING':
        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ไม่ต้องระบุ jsonField - จะใช้ผลลัพธ์จาก step ก่อนหน้าเป็น input
                </div>
              </div>
            )}
            {isFirstStep && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSON Field Path <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={params.jsonField || ''}
                  onChange={(e) => updateParam('jsonField', e.target.value)}
                  placeholder="เช่น eAPPDetails.0.CampaignCode"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Position
                </label>
                <input
                  type="number"
                  value={params.start ?? 0}
                  onChange={(e) => updateParam('start', parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">เริ่มที่ตำแหน่ง (0 = เริ่มต้น)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Length
                </label>
                <input
                  type="number"
                  value={params.length ?? ''}
                  onChange={(e) => updateParam('length', parseInt(e.target.value) || undefined)}
                  placeholder="จำนวนตัวอักษร"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนตัวอักษรที่ต้องการ</p>
              </div>
            </div>
          </div>
        )

      case 'CONCAT':
        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ค่าจาก step ก่อนหน้าจะถูก concat กับ fields อื่นๆ
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fields to Concatenate <span className="text-red-600">*</span>
              </label>
              <textarea
                value={(params.fields || []).join('\n')}
                onChange={(e) => updateParam('fields', e.target.value.split('\n').filter(f => f.trim()))}
                placeholder="field1&#10;field2&#10;field3"
                className="w-full p-2 border border-gray-300 text-xs font-mono"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                ใส่ field paths ที่ต้องการ concat (แยกบรรทัด)
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Separator
              </label>
              <input
                type="text"
                value={params.separator ?? ' '}
                onChange={(e) => updateParam('separator', e.target.value)}
                placeholder="ตัวคั่น (เช่น space, comma, etc.)"
                className="w-full p-2 border border-gray-300 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                ตัวคั่นระหว่าง fields (default: space)
              </p>
            </div>
          </div>
        )

      case 'CUSTOM':
        const selectedFunc = customFunctions.find(f => f.function_name === params.functionName)

        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ผลลัพธ์จาก step ก่อนหน้าจะถูกส่งเข้า custom function เป็น input
                </div>
              </div>
            )}
            {customFunctions.length === 0 && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs mb-2">
                กำลังโหลด custom functions... ถ้าไม่มีให้ไปสร้างที่ <a href="/functions" className="text-blue-600 underline">/functions</a> ก่อน
              </div>
            )}
            <div className="text-xs text-gray-500 mb-1">
              Debug: params.functionName = "{params.functionName || 'empty'}", customFunctions count = {customFunctions.length}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Custom Function <span className="text-red-600">*</span>
              </label>
              <select
                value={params.functionName || ''}
                onChange={(e) => {
                  const funcName = e.target.value
                  console.log('========== CHAINBUILDER CUSTOM FUNCTION SELECTED ==========')
                  console.log('Selected function name:', funcName)
                  console.log('Current params:', params)
                  console.log('Available custom functions:', customFunctions)
                  const func = customFunctions.find(f => f.function_name === funcName)
                  console.log('Found function:', func)

                  // Prepare new params object
                  const newParams = { ...params, functionName: funcName }

                  // Auto-populate parameters if available
                  if (func?.parameters) {
                    console.log('Function has parameters, auto-populating...')
                    try {
                      const funcParams = typeof func.parameters === 'string'
                        ? JSON.parse(func.parameters)
                        : func.parameters

                      console.log('Parsed funcParams:', funcParams)

                      if (Array.isArray(funcParams)) {
                        const paramsObj = {}
                        funcParams.forEach(p => {
                          paramsObj[p.name] = p.default || ''
                        })
                        console.log('Auto-populated paramsObj:', paramsObj)
                        newParams.functionParams = paramsObj
                      } else {
                        console.log('Using funcParams directly:', funcParams)
                        newParams.functionParams = funcParams
                      }
                    } catch (err) {
                      console.error('Error parsing function parameters:', err)
                      newParams.functionParams = {}
                    }
                  }

                  console.log('Final newParams to update:', newParams)
                  // Update all params at once
                  handleUpdateParams(index, newParams)
                  console.log('========== END CHAINBUILDER ==========')
                }}
                className="w-full p-2 border border-gray-300 text-sm"
              >
                <option value="">-- เลือก Function ({customFunctions.length} available) --</option>
                {customFunctions.map(func => (
                  <option key={func.id} value={func.function_name}>
                    {func.function_name}
                    {func.description ? ` - ${func.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Function Info */}
            {selectedFunc && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs font-medium text-blue-900">
                  {selectedFunc.function_name}
                </div>
                {selectedFunc.description && (
                  <div className="text-xs text-blue-700 mt-1">
                    {selectedFunc.description}
                  </div>
                )}
                {selectedFunc.parameters && (
                  <div className="text-xs mt-1">
                    <div className="font-medium text-blue-900">Parameters:</div>
                    <pre className="text-xs bg-white p-1 rounded mt-1 overflow-auto">
                      {typeof selectedFunc.parameters === 'string'
                        ? selectedFunc.parameters
                        : JSON.stringify(selectedFunc.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Function Parameters Editor */}
            {selectedFunc && selectedFunc.parameters && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Function Parameters (JSON)
                </label>
                <textarea
                  value={JSON.stringify(params.functionParams || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      updateParam('functionParams', JSON.parse(e.target.value))
                    } catch (err) {
                      // Invalid JSON
                    }
                  }}
                  className="w-full p-2 border border-gray-300 text-sm font-mono"
                  rows={4}
                />
              </div>
            )}
          </div>
        )

      case 'CONFIG':
        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ค่าจาก step ก่อนหน้าจะถูกใช้เป็น lookup key ใน config
                </div>
              </div>
            )}
            {isFirstStep && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSON Field Path <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={params.jsonField || ''}
                  onChange={(e) => updateParam('jsonField', e.target.value)}
                  placeholder="เช่น eAPPDetails.0.RelationType"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Field ที่มี code ที่ต้องการ lookup
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Config Key <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={params.configKey || ''}
                onChange={(e) => updateParam('configKey', e.target.value)}
                placeholder="เช่น INSURED, GENDER, etc."
                className="w-full p-2 border border-gray-300 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Config table key ที่ใช้ในการ lookup
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fallbackToSource"
                checked={params.fallbackToSource || false}
                onChange={(e) => updateParam('fallbackToSource', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="fallbackToSource" className="text-xs text-gray-700">
                Fallback to source value if not found in config
              </label>
            </div>
          </div>
        )

      case 'DATE':
        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ค่า date จาก step ก่อนหน้าจะถูก format ตามที่กำหนด
                </div>
              </div>
            )}
            {isFirstStep && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSON Field Path <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={params.jsonField || ''}
                  onChange={(e) => updateParam('jsonField', e.target.value)}
                  placeholder="เช่น eAPPDetails.0.Insured.0.Dob"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Path ไปยังฟิลด์วันที่ใน JSON
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Input Format
              </label>
              <select
                value={params.inputFormat || ''}
                onChange={(e) => updateParam('inputFormat', e.target.value)}
                className="w-full p-2 border border-gray-300 text-sm"
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
                รูปแบบวันที่ใน input (ถ้าไม่ระบุจะใช้ ISO format)
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Output Format <span className="text-red-600">*</span>
              </label>
              <select
                value={params.outputFormat || params.format || ''}
                onChange={(e) => {
                  // Use outputFormat and remove old format param if exists
                  const newParams = { ...params, outputFormat: e.target.value }
                  delete newParams.format
                  handleUpdateParams(index, newParams)
                }}
                className="w-full p-2 border border-gray-300 text-sm"
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
          </div>
        )

      case 'NUMBER':
        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ค่า number จาก step ก่อนหน้าจะถูก format ตามที่กำหนด
                </div>
              </div>
            )}
            {isFirstStep && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSON Field Path <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={params.jsonField || ''}
                  onChange={(e) => updateParam('jsonField', e.target.value)}
                  placeholder="เช่น eAPPDetails.0.PremiumAmount"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Decimal Places
                </label>
                <input
                  type="number"
                  value={params.decimals ?? 2}
                  onChange={(e) => updateParam('decimals', parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">จำนวนทศนิยม (เช่น 2 = 1.50)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Thousands Separator
                </label>
                <select
                  value={params.thousandsSeparator || ''}
                  onChange={(e) => updateParam('thousandsSeparator', e.target.value)}
                  className="w-full p-2 border border-gray-300 text-sm"
                >
                  <option value="">None</option>
                  <option value=",">, (Comma)</option>
                  <option value=" ">  (Space)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">ตัวคั่นหลักพัน (เช่น 1,000)</p>
              </div>
            </div>
          </div>
        )

      case 'CONDITION':
        return (
          <div className="space-y-2">
            {showInputInfo && (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                <div className="font-medium text-yellow-900">
                  ℹ️ Input จาก step ก่อนหน้าจะถูกใช้โดยอัตโนมัติ
                </div>
                <div className="text-yellow-700 mt-1">
                  ค่าจาก step ก่อนหน้าจะถูกเปรียบเทียบกับเงื่อนไข
                </div>
              </div>
            )}
            {isFirstStep && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSON Field Path <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={params.jsonField || ''}
                  onChange={(e) => updateParam('jsonField', e.target.value)}
                  placeholder="เช่น eAPPDetails.0.PolicyStatus"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                value={params.operator || '=='}
                onChange={(e) => updateParam('operator', e.target.value)}
                className="w-full p-2 border border-gray-300 text-sm"
              >
                <option value="==">Equals (==)</option>
                <option value="!=">Not Equals (!=)</option>
                <option value=">">Greater Than (&gt;)</option>
                <option value="<">Less Than (&lt;)</option>
                <option value="contains">Contains</option>
                <option value="isEmpty">Is Empty</option>
              </select>
            </div>
            {params.operator !== 'isEmpty' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Compare Value
                </label>
                <input
                  type="text"
                  value={params.compareValue || ''}
                  onChange={(e) => updateParam('compareValue', e.target.value)}
                  placeholder="ค่าที่ใช้เปรียบเทียบ"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                True Value
              </label>
              <input
                type="text"
                value={params.trueValue || ''}
                onChange={(e) => updateParam('trueValue', e.target.value)}
                placeholder="ค่าถ้าเงื่อนไขเป็นจริง"
                className="w-full p-2 border border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                False Value
              </label>
              <input
                type="text"
                value={params.falseValue || ''}
                onChange={(e) => updateParam('falseValue', e.target.value)}
                placeholder="ค่าถ้าเงื่อนไขเป็นเท็จ"
                className="w-full p-2 border border-gray-300 text-sm"
              />
            </div>
          </div>
        )

      case 'CONDITION_MULTIPLE':
        return (
          <div className="space-y-2">
            <div className="p-2 bg-blue-50 border border-blue-300 rounded text-xs">
              <div className="font-medium text-blue-900">
                ℹ️ Multiple IF-ELSE Conditions
              </div>
              <p className="text-xs text-blue-700">
                ตรวจสอบเงื่อนไขหลายๆ อัน ตามลำดับ (if-else if-else if-else) เงื่อนไขแรกที่เป็นจริงจะถูกใช้
              </p>
            </div>

            {/* Conditions List */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-gray-700">
                  Conditions (IF-ELSE IF)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const conditions = params.conditions || []
                    updateParam('conditions', [...conditions, { jsonField: '', operator: '==', compareValue: '', result: '' }])
                  }}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Condition
                </button>
              </div>

              {(!params.conditions || params.conditions.length === 0) ? (
                <div className="p-2 bg-gray-50 border border-gray-300 rounded text-xs text-gray-600">
                  ไม่มี conditions (กด "+ Add Condition" เพื่อเพิ่ม)
                </div>
              ) : (
                <div className="space-y-2">
                  {params.conditions.map((condition, conditionIndex) => (
                    <div key={conditionIndex} className="p-2 bg-gray-50 border border-gray-300 rounded space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">
                          {conditionIndex === 0 ? 'IF' : `ELSE IF ${conditionIndex}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const conditions = params.conditions.filter((_, i) => i !== conditionIndex)
                            updateParam('conditions', conditions)
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          JSON Field Path <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={condition.jsonField || ''}
                          onChange={(e) => {
                            const conditions = [...params.conditions]
                            conditions[conditionIndex] = { ...condition, jsonField: e.target.value }
                            updateParam('conditions', conditions)
                          }}
                          placeholder="เช่น eAPPDetails.0.Status"
                          className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
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
                              const conditions = [...params.conditions]
                              conditions[conditionIndex] = { ...condition, operator: e.target.value }
                              updateParam('conditions', conditions)
                            }}
                            className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
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
                                const conditions = [...params.conditions]
                                conditions[conditionIndex] = { ...condition, compareValue: e.target.value }
                                updateParam('conditions', conditions)
                              }}
                              placeholder="ค่าที่ใช้เปรียบเทียบ"
                              className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
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
                            const conditions = [...params.conditions]
                            conditions[conditionIndex] = { ...condition, result: e.target.value }
                            updateParam('conditions', conditions)
                          }}
                          placeholder="ค่าที่จะส่งกลับ"
                          className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Default Value (ELSE) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Default Value (ELSE - ถ้าไม่มีเงื่อนไขไหนเป็นจริง)
              </label>
              <input
                type="text"
                value={params.defaultValue || ''}
                onChange={(e) => updateParam('defaultValue', e.target.value)}
                placeholder="ค่าที่ส่งกลับถ้าไม่มีเงื่อนไขไหนเป็นจริง"
                className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                ค่า default ที่จะส่งกลับถ้าไม่มีเงื่อนไขไหนเป็นจริงเลย (ELSE clause)
              </p>
            </div>
          </div>
        )

      case 'PRIORITY':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Field Priority (First to Last) <span className="text-red-600">*</span>
            </label>
            <textarea
              value={(params.fields || []).join('\n')}
              onChange={(e) => updateParam('fields', e.target.value.split('\n').filter(f => f.trim()))}
              placeholder="field1&#10;field2&#10;field3"
              className="w-full p-2 border border-gray-300 text-xs font-mono"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              ระบุ field paths ตามลำดับความสำคัญ (บรรทัดแรก = สำคัญที่สุด) - จะใช้ field แรกที่มีค่า
            </p>
          </div>
        )

      case 'ARRAY':
        return (
          <div className="space-y-2">
            {!showInputInfo && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSON Array Field Path <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={params.jsonField || ''}
                  onChange={(e) => updateParam('jsonField', e.target.value)}
                  placeholder="เช่น eAPPDetails.0.Riders"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Path ไปยัง array ที่ต้องการใช้งาน
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Operation <span className="text-red-600">*</span>
              </label>
              <select
                value={params.operation || 'join'}
                onChange={(e) => updateParam('operation', e.target.value)}
                className="w-full p-2 border border-gray-300 text-sm"
              >
                <option value="join">Join - รวม array เป็น string</option>
                <option value="length">Length - นับจำนวน items</option>
                <option value="first">First - เลือก item แรก</option>
                <option value="last">Last - เลือก item สุดท้าย</option>
              </select>
            </div>
            {params.operation === 'join' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Separator
                </label>
                <input
                  type="text"
                  value={params.separator ?? ', '}
                  onChange={(e) => updateParam('separator', e.target.value)}
                  placeholder="ตัวคั่น (เช่น , or ; or space)"
                  className="w-full p-2 border border-gray-300 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ตัวคั่นระหว่าง items เมื่อ join (default: ", ")
                </p>
              </div>
            )}
          </div>
        )

      case 'EXPRESSION':
        return (
          <div className="space-y-2">
            <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
              <div className="font-medium text-yellow-800 mb-1">
                ⚠️ Advanced Function Type
              </div>
              <p className="text-xs text-yellow-700">
                EXPRESSION ใช้ JavaScript expression ในการคำนวณค่า (เช่น data.field1 + data.field2)
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expression <span className="text-red-600">*</span>
              </label>
              <textarea
                value={params.expression || ''}
                onChange={(e) => updateParam('expression', e.target.value)}
                placeholder="data.field1 + data.field2&#10;data.price * 1.07&#10;data.firstName + ' ' + data.lastName"
                className="w-full p-2 border border-gray-300 text-xs font-mono"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                JavaScript expression ที่สามารถใช้ตัวแปร "data" เพื่อเข้าถึง JSON data
              </p>
            </div>
          </div>
        )

      case 'JSCODE':
        return (
          <div className="space-y-2">
            <div className="p-2 bg-red-50 border border-red-300 rounded text-xs">
              <div className="font-medium text-red-800 mb-1">
                ⚠️ Advanced Function Type - Use with Caution
              </div>
              <p className="text-xs text-red-700">
                JSCODE ให้คุณเขียน JavaScript code ได้เต็มรูปแบบ รวมถึง loops, conditions, และ functions
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                JavaScript Code <span className="text-red-600">*</span>
              </label>
              <textarea
                value={params.code || ''}
                onChange={(e) => updateParam('code', e.target.value)}
                placeholder="// ใช้ตัวแปร data, params, และ helpers&#10;return data.field;"
                className="w-full p-2 border border-gray-300 text-xs font-mono"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                JavaScript code ที่จะถูก execute (ใช้ return เพื่อส่งค่ากลับ)
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Helper Functions (Optional)
              </label>
              <textarea
                value={(params.helpers || []).join('\n')}
                onChange={(e) => updateParam('helpers', e.target.value.split('\n').filter(f => f.trim()))}
                placeholder="helper1&#10;helper2"
                className="w-full p-2 border border-gray-300 text-xs font-mono"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                ชื่อ helper functions ที่ต้องการใช้ (แยกบรรทัด)
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-xs text-gray-500">
            No parameters needed
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">
          Chain Steps ({steps.length})
        </h4>
        <button
          type="button"
          onClick={handleAddStep}
          className="px-3 py-1 bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          + Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-gray-300 rounded text-center text-sm text-gray-500">
          คลิก "Add Step" เพื่อเริ่มสร้าง chain
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const funcInfo = AVAILABLE_FUNCTIONS.find(f => f.value === step.type)
            const isExpanded = expandedStep === index

            return (
              <div
                key={index}
                className={`border ${isExpanded ? 'border-blue-500' : 'border-gray-300'} rounded`}
              >
                {/* Step Header */}
                <div
                  className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedStep(isExpanded ? -1 : index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-600">
                      Step {index + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {funcInfo?.label || step.type}
                    </span>
                    {step.type === 'ARRAY_FILTER' && step.params?.selectField && (
                      <span className="text-xs text-gray-600">
                        → {step.params.selectField}
                      </span>
                    )}
                    {step.type === 'CUSTOM' && step.params?.functionName && (
                      <span className="text-xs text-gray-600">
                        → {step.params.functionName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveStep(index, 'up')
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100"
                      >
                        ↑
                      </button>
                    )}
                    {index < steps.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoveStep(index, 'down')
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveStep(index)
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Step Content */}
                {isExpanded && (
                  <div className="p-3 space-y-3 bg-white">
                    {/* Input Info */}
                    {index > 0 && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <div className="font-medium text-blue-900 mb-1">
                          📥 Input จาก Step {index}:
                        </div>
                        <div className="text-blue-700">
                          {getOutputDescription(index)}
                        </div>
                      </div>
                    )}

                    {/* Function Type Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Function Type
                      </label>
                      <select
                        value={step.type}
                        onChange={(e) => handleUpdateStep(index, 'type', e.target.value)}
                        className="w-full p-2 border border-black text-sm"
                      >
                        {AVAILABLE_FUNCTIONS.map(func => (
                          <option key={func.value} value={func.value}>
                            {func.label} - {func.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Parameters */}
                    {renderStepParams(step, index)}

                    {/* Output Preview */}
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <div className="font-medium text-green-900 mb-1">
                        📤 Output จาก step นี้:
                      </div>
                      <div className="text-green-700">
                        {getOutputDescription(index + 1)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {steps.length > 0 && (
        <div className="p-3 bg-gray-50 border border-gray-300 rounded">
          <div className="text-xs font-medium text-gray-700 mb-2">
            📊 Summary:
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="font-medium">Step {index + 1}:</span>
                <span>{AVAILABLE_FUNCTIONS.find(f => f.value === step.type)?.label}</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-500">
                  {getOutputDescription(index + 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
