'use client'

import { useState, useEffect } from 'react'

export default function NodeConfigModal({ node, isOpen, onClose, onSave }) {
  const [config, setConfig] = useState({
    name: '',
    type: 'custom',
    api_path: '',
    database_table: '',
    external_api_url: '',
    input_mapping: {},
    output_mapping: {},
    config: {}
  })
  const [inputMappingRows, setInputMappingRows] = useState([{ source: '', target: '' }])
  const [outputMappingRows, setOutputMappingRows] = useState([{ source: '', target: '' }])

  useEffect(() => {
    if (node && isOpen) {
      setConfig({
        name: node.name || '',
        type: node.type || 'custom',
        api_path: node.api_path || '',
        database_table: node.database_table || '',
        external_api_url: node.external_api_url || '',
        input_mapping: node.input_mapping || {},
        output_mapping: node.output_mapping || {},
        config: node.config || {}
      })

      // Convert mapping objects to rows for editing
      const inputRows = Object.entries(node.input_mapping || {}).map(([target, source]) => ({
        source,
        target
      }))
      setInputMappingRows(inputRows.length > 0 ? inputRows : [{ source: '', target: '' }])

      const outputRows = Object.entries(node.output_mapping || {}).map(([target, source]) => ({
        source,
        target
      }))
      setOutputMappingRows(outputRows.length > 0 ? outputRows : [{ source: '', target: '' }])
    }
  }, [node, isOpen])

  const handleSave = () => {
    // Convert mapping rows back to objects
    const input_mapping = {}
    inputMappingRows.forEach(row => {
      if (row.source && row.target) {
        input_mapping[row.target] = row.source
      }
    })

    const output_mapping = {}
    outputMappingRows.forEach(row => {
      if (row.source && row.target) {
        output_mapping[row.target] = row.source
      }
    })

    const updatedNode = {
      ...config,
      input_mapping,
      output_mapping
    }

    onSave(updatedNode)
  }

  const addMappingRow = (type) => {
    if (type === 'input') {
      setInputMappingRows([...inputMappingRows, { source: '', target: '' }])
    } else {
      setOutputMappingRows([...outputMappingRows, { source: '', target: '' }])
    }
  }

  const removeMappingRow = (type, index) => {
    if (type === 'input') {
      setInputMappingRows(inputMappingRows.filter((_, i) => i !== index))
    } else {
      setOutputMappingRows(outputMappingRows.filter((_, i) => i !== index))
    }
  }

  const updateMappingRow = (type, index, field, value) => {
    if (type === 'input') {
      const newRows = [...inputMappingRows]
      newRows[index][field] = value
      setInputMappingRows(newRows)
    } else {
      const newRows = [...outputMappingRows]
      newRows[index][field] = value
      setOutputMappingRows(newRows)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">กำหนดค่า Node: {node?.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">การตั้งค่าพื้นฐาน</h3>

              <div>
                <label className="block text-sm font-bold mb-2">ชื่อ Node</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">ประเภท</label>
                <select
                  value={config.type}
                  onChange={(e) => setConfig({ ...config, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="custom">Custom</option>
                  <option value="product">Product</option>
                  <option value="template">Template</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">API Path</label>
                <input
                  type="text"
                  value={config.api_path}
                  onChange={(e) => setConfig({ ...config, api_path: e.target.value })}
                  placeholder="/api/custom-endpoint"
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  กำหนด API endpoint สำหรับ node นี้
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Database Table</label>
                <input
                  type="text"
                  value={config.database_table}
                  onChange={(e) => setConfig({ ...config, database_table: e.target.value })}
                  placeholder="table_name"
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ตารางในฐานข้อมูลสำหรับเก็บข้อมูล (ไม่จำเป็น)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">External API URL</label>
                <input
                  type="url"
                  value={config.external_api_url}
                  onChange={(e) => setConfig({ ...config, external_api_url: e.target.value })}
                  placeholder="https://api.example.com/endpoint"
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL ของ API ภายนอกที่จะเรียกใช้ (ไม่จำเป็น)
                </p>
              </div>
            </div>

            {/* Mapping Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">การ Mapping ข้อมูล</h3>

              {/* Input Mapping */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold">Input Mapping</label>
                  <button
                    onClick={() => addMappingRow('input')}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + เพิ่ม
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {inputMappingRows.map((row, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Source (เช่น node1.data.name)"
                        value={row.source}
                        onChange={(e) => updateMappingRow('input', index, 'source', e.target.value)}
                        className="flex-1 p-1 text-xs border border-gray-300 rounded"
                      />
                      <span className="py-1 text-xs">→</span>
                      <input
                        type="text"
                        placeholder="Target (เช่น customer_name)"
                        value={row.target}
                        onChange={(e) => updateMappingRow('input', index, 'target', e.target.value)}
                        className="flex-1 p-1 text-xs border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => removeMappingRow('input', index)}
                        className="px-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Output Mapping */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold">Output Mapping</label>
                  <button
                    onClick={() => addMappingRow('output')}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    + เพิ่ม
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {outputMappingRows.map((row, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Source (เช่น response.id)"
                        value={row.source}
                        onChange={(e) => updateMappingRow('output', index, 'source', e.target.value)}
                        className="flex-1 p-1 text-xs border border-gray-300 rounded"
                      />
                      <span className="py-1 text-xs">→</span>
                      <input
                        type="text"
                        placeholder="Target (เช่น customer_id)"
                        value={row.target}
                        onChange={(e) => updateMappingRow('output', index, 'target', e.target.value)}
                        className="flex-1 p-1 text-xs border border-gray-300 rounded"
                      />
                      <button
                        onClick={() => removeMappingRow('output', index)}
                        className="px-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Instructions */}
              <div className="bg-gray-50 p-3 rounded text-xs">
                <h4 className="font-bold mb-2">วิธีใช้ Mapping:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>Input Mapping:</strong> จับคู่ข้อมูลจาก node ก่อนหน้า → ฟิลด์ใน database/API</li>
                  <li><strong>Output Mapping:</strong> จับคู่ข้อมูลจาก response → ฟิลด์สำหรับ node ถัดไป</li>
                  <li><strong>Source Path:</strong> ใช้ dot notation (เช่น node1.data.name)</li>
                  <li><strong>Target Field:</strong> ชื่อฟิลด์ใน database หรือ API payload</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}