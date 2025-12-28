'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TreeNode from '../../components/TreeNode'
import MappingForm from '../../components/MappingForm'

export default function ProductDetailPage({ params }) {
  const router = useRouter()
  const [product, setProduct] = useState(null)
  const [template, setTemplate] = useState(null)
  const [templateMappings, setTemplateMappings] = useState([])
  const [productMappings, setProductMappings] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(0)
  
  // Execute SOAP states
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [selectedMessageForExecution, setSelectedMessageForExecution] = useState(0)
  const [jsonSource, setJsonSource] = useState('none') // 'none', 'file', 'log'
  const [jsonFile, setJsonFile] = useState(null)
  const [jsonData, setJsonData] = useState(null)
  const [apiLogs, setApiLogs] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMappingCopyModal, setShowMappingCopyModal] = useState(false)
  const [mappingToCopy, setMappingToCopy] = useState(null)
  const [targetXmlPath, setTargetXmlPath] = useState('')

  useEffect(() => {
    loadProduct()
  }, [])

  const loadProduct = async () => {
    try {
      const id = (await params).id
      
      // Load product
      const productRes = await fetch(`/api/products/${id}`)
      const productData = await productRes.json()
      setProduct(productData)
      
      // Load template
      const templateRes = await fetch(`/api/templates/${productData.template_id}`)
      const templateData = await templateRes.json()
      setTemplate(templateData)
      
      // Load template mappings
      const templateMappingsRes = await fetch(`/api/mappings/template?template_id=${productData.template_id}`)
      const templateMappingsData = await templateMappingsRes.json()
      if (Array.isArray(templateMappingsData)) {
        setTemplateMappings(templateMappingsData)
      }
      
      // Load product mappings (overrides)
      const productMappingsRes = await fetch(`/api/mappings/product?product_id=${id}`)
      const productMappingsData = await productMappingsRes.json()
      if (Array.isArray(productMappingsData)) {
        setProductMappings(productMappingsData)
      }
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMergedMappings = () => {
    // Merge template and product mappings (product overrides template)
    const mappingMap = new Map()
    
    // Add template mappings
    templateMappings.forEach(m => {
      mappingMap.set(m.xml_path, { ...m, source: 'template' })
    })
    
    // Override with product mappings
    productMappings.forEach(m => {
      mappingMap.set(m.xml_path, { ...m, source: 'product' })
    })
    
    return Array.from(mappingMap.values())
  }

  const handleNodeSelect = (node) => {
    if (!node.children || node.children.length === 0) {
      // Check if there's a template mapping for this node
      const templateMapping = templateMappings.find(m => m.xml_path === node.path)

      // Pass template mapping as default values when creating override
      setSelectedNode({
        ...node,
        templateMapping: templateMapping
      })
    }
  }

  const handleEditMapping = (mapping) => {
    // Find the node from xml structure
    const findNode = (nodes, path) => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children) {
          const found = findNode(node.children, path)
          if (found) return found
        }
      }
      return null
    }

    if (template?.xml_structure) {
      const structure = typeof template.xml_structure === 'string'
        ? JSON.parse(template.xml_structure)
        : template.xml_structure

      for (const message of structure) {
        const node = findNode(message.structure.children || [], mapping.xml_path)
        if (node) {
          // Include template mapping for reference
          const templateMapping = templateMappings.find(m => m.xml_path === mapping.xml_path)
          setSelectedNode({
            ...node,
            existingMapping: mapping,
            templateMapping: templateMapping
          })
          break
        }
      }
    }
  }

  const handleSaveOverride = (mapping) => {
    // Update or add mapping
    const existingIndex = productMappings.findIndex(m => m.xml_path === mapping.xml_path)
    if (existingIndex >= 0) {
      const updated = [...productMappings]
      updated[existingIndex] = mapping
      setProductMappings(updated)
    } else {
      setProductMappings([...productMappings, mapping])
    }

    // Reset selection
    setSelectedNode(null)
  }

  const handleRemoveOverride = (xmlPath) => {
    setProductMappings(productMappings.filter(m => m.xml_path !== xmlPath))
  }

  const handleCopyMapping = (mapping) => {
    setMappingToCopy(mapping)
    setTargetXmlPath('')
    setShowMappingCopyModal(true)
  }

  const handleConfirmCopyMapping = () => {
    if (!mappingToCopy || !targetXmlPath) {
      alert('กรุณาเลือก XML field ปลายทาง')
      return
    }

    // Find the target node to get its metadata
    const findNode = (nodes, path) => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children) {
          const found = findNode(node.children, path)
          if (found) return found
        }
      }
      return null
    }

    let targetNode = null
    if (template?.xml_structure) {
      const structure = typeof template.xml_structure === 'string'
        ? JSON.parse(template.xml_structure)
        : template.xml_structure

      for (const message of structure) {
        targetNode = findNode(message.structure.children || [], targetXmlPath)
        if (targetNode) break
      }
    }

    if (!targetNode) {
      alert('ไม่พบ XML field ที่เลือก')
      return
    }

    // Create new mapping with copied values but new xml_path
    // Check if this is copying from template or product mapping
    const isProductMapping = mappingToCopy.source === 'product'
    const newMapping = {
      ...mappingToCopy,
      xml_path: targetXmlPath,
      xml_name: targetNode.name,
      xml_type: targetNode.type,
      is_required: targetNode.required || false
    }

    // Check if there's a template mapping for reference
    const templateMapping = templateMappings.find(m => m.xml_path === targetXmlPath)

    // Open the form with this mapping
    setSelectedNode({
      ...targetNode,
      existingMapping: isProductMapping ? newMapping : null,
      templateMapping: isProductMapping ? templateMapping : newMapping
    })
    setShowMappingCopyModal(false)
    setMappingToCopy(null)
    setTargetXmlPath('')
  }

  const handleSaveOverrides = async () => {
    setSaving(true)
    try {
      const id = (await params).id
      const mappingsToSave = productMappings.map(m => ({
        product_id: parseInt(id),
        xml_path: m.xml_path,
        json_field: m.json_field,
        parent_node: m.xml_path.split('.').slice(0, -1).join('.'),
        is_required: m.is_required || false,
        default_value: m.default_value || null,
        function_type: m.function_type || 'DIRECT',
        function_params: m.function_params || {},
        description: m.description || null,
        is_active: m.is_active !== undefined ? m.is_active : true
      }))

      const res = await fetch('/api/mappings/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingsToSave)
      })

      if (res.ok) {
        alert('บันทึก Override สำเร็จ')
        await loadProduct()
      } else {
        const error = await res.json()
        alert('Error: ' + (error.error || 'Failed to save overrides'))
      }
    } catch (error) {
      alert('Error saving overrides: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenExecuteModal = async () => {
    setShowExecuteModal(true)
    setExecutionResult(null)
    
    // Load API logs for this product
    try {
      const res = await fetch(`/api/logs?product=${encodeURIComponent(product.product_name)}&limit=10`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setApiLogs(data)
      }
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setJsonFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result)
          setJsonData(json)
        } catch (error) {
          alert('Invalid JSON file')
          setJsonFile(null)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleLoadLog = async (logId) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId })
      })
      const data = await res.json()
      if (data.json_data) {
        setJsonData(typeof data.json_data === 'string' ? JSON.parse(data.json_data) : data.json_data)
        setSelectedLog(logId)
      }
    } catch (error) {
      alert('Error loading log: ' + error.message)
    }
  }

  const handleExecuteSOAP = async () => {
    setExecuting(true)
    try {
      const id = (await params).id
      const res = await fetch('/api/soap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(id),
          json_data: jsonData,
          policy_no: jsonData?.policy_no || null,
          mstr_policy_no: jsonData?.mstr_policy_no || null,
          message_index: selectedMessageForExecution
        })
      })

      const result = await res.json()
      setExecutionResult(result)
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error.message
      })
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  if (!product || !template) {
    return <div className="min-h-screen flex items-center justify-center">ไม่พบข้อมูล</div>
  }

  const xmlStructure = typeof template.xml_structure === 'string' 
    ? JSON.parse(template.xml_structure) 
    : template.xml_structure

  const mergedMappings = getMergedMappings()

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{product.product_name}</h1>
            <p className="text-gray-600 mt-2">Template: {template.template_name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExecuteModal(true)}
              className="px-6 py-2 bg-black text-white hover:bg-gray-800 font-medium"
            >
              ⚡ Execute SOAP
            </button>
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-2 border border-black hover:bg-gray-50"
            >
              ← กลับ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: XML Structure Tree */}
          <div className="bg-white border border-black">
            <div className="bg-black text-white p-4">
              <h3 className="font-bold text-lg">XML Request Structure</h3>
              <p className="text-sm text-gray-300 mt-1">คลิกที่ field เพื่อ override mapping</p>
            </div>

            {xmlStructure && xmlStructure.length > 0 && (
              <>
                {xmlStructure.length > 1 && (
                  <div className="p-4 border-b border-black">
                    <select
                      value={selectedMessage}
                      onChange={(e) => setSelectedMessage(parseInt(e.target.value))}
                      className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {xmlStructure.map((msg, idx) => (
                        <option key={idx} value={idx}>
                          {msg.messageName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-4 max-h-[600px] overflow-auto">
                  <TreeNode 
                    node={xmlStructure[selectedMessage].structure} 
                    onSelect={handleNodeSelect}
                    selectedPath={selectedNode?.path}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right: Override Form & List */}
          <div className="space-y-6">
            {/* Override Form */}
            {selectedNode && (
              <div className="bg-white border border-black p-6">
                <h3 className="font-bold text-lg mb-4">Override Mapping</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      XML Field
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-300 rounded">
                      <div className="font-medium">{selectedNode.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{selectedNode.path}</div>
                    </div>
                  </div>

                  {/* Show template mapping if exists */}
                  {templateMappings.find(m => m.xml_path === selectedNode.path) && !productMappings.find(m => m.xml_path === selectedNode.path) && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm font-medium text-blue-900 mb-1">Template Mapping:</div>
                      <div className="text-sm text-blue-700">
                        {templateMappings.find(m => m.xml_path === selectedNode.path)?.json_field || 'ใช้ default value'}
                      </div>
                    </div>
                  )}

                  <MappingForm
                    selectedNode={selectedNode}
                    existingMapping={productMappings.find(m => m.xml_path === selectedNode.path)}
                    onSave={handleSaveOverride}
                    onCancel={() => setSelectedNode(null)}
                  />
                </div>
              </div>
            )}

            {/* All Mappings List */}
            <div className="bg-white border border-black">
              <div className="bg-black text-white p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-bold text-lg">All Mappings ({mergedMappings.length})</h3>
                    <p className="text-xs text-gray-300 mt-1">
                      จาก Template: {templateMappings.length} | Overrides: {productMappings.length}
                    </p>
                  </div>
                  <button
                    onClick={handleSaveOverrides}
                    disabled={saving}
                    className="px-4 py-2 bg-white text-black hover:bg-gray-200 disabled:bg-gray-400 disabled:text-gray-600 text-sm"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก Overrides'}
                  </button>
                </div>

                {/* Search Field */}
                {mergedMappings.length > 0 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="🔍 ค้นหา XML Field หรือ JSON Field..."
                      className="w-full px-4 py-2 bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="max-h-[500px] overflow-auto">
                {mergedMappings.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    ยังไม่มี Mapping<br/>
                    <span className="text-sm">กรุณาสร้าง mapping ใน template ก่อน</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {mergedMappings
                      .filter(mapping => {
                        if (!searchQuery) return true
                        const query = searchQuery.toLowerCase()
                        return (
                          mapping.xml_path?.toLowerCase().includes(query) ||
                          mapping.xml_name?.toLowerCase().includes(query) ||
                          mapping.json_field?.toLowerCase().includes(query)
                        )
                      })
                      .map((mapping, index) => (
                      <div key={index} className={`p-4 hover:bg-gray-50 group ${
                        mapping.source === 'product' ? 'bg-yellow-50' : ''
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{mapping.xml_name || mapping.xml_path.split('.').pop()}</span>
                              <span className="text-gray-400">→</span>
                              {mapping.json_field ? (
                                <span className="text-blue-600 font-medium">{mapping.json_field}</span>
                              ) : mapping.function_type === 'CHAIN' && mapping.function_params?.steps ? (
                                <span className="text-purple-600 font-medium">
                                  Chain ({mapping.function_params.steps.length} steps)
                                </span>
                              ) : mapping.function_type && mapping.function_type !== 'DIRECT' ? (
                                <span className="text-indigo-600 font-medium">
                                  {mapping.function_type}
                                </span>
                              ) : (
                                <span className="text-orange-600 font-medium italic">ใช้ default value</span>
                              )}
                              {mapping.source === 'product' && (
                                <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded">
                                  Override
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              XML: {mapping.xml_path}
                            </div>
                            {mapping.function_type === 'CHAIN' && mapping.function_params?.steps && (
                              <div className="text-xs text-gray-600 mt-1 bg-purple-50 px-2 py-1 rounded">
                                Chain: {mapping.function_params.steps.map(s => s.type).join(' → ')}
                              </div>
                            )}
                            {mapping.default_value && (
                              <div className="text-xs text-gray-600 mt-1">
                                Default: <span className="font-mono bg-gray-100 px-1">{mapping.default_value}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditMapping(mapping)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title={mapping.source === 'product' ? "Edit override" : "Edit (will create override)"}
                            >
                              ✎ Edit
                            </button>
                            <button
                              onClick={() => handleCopyMapping(mapping)}
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="Copy mapping to another field"
                            >
                              ⎘ Copy
                            </button>
                            {mapping.source === 'product' && (
                              <button
                                onClick={() => handleRemoveOverride(mapping.xml_path)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove override"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execute SOAP Modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-black text-white p-4 flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold">Execute SOAP Request</h2>
              <button
                onClick={() => setShowExecuteModal(false)}
                className="text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!executionResult ? (
                <>
                  {/* Request Message Selection (if multiple) */}
                  {xmlStructure && xmlStructure.length > 1 && (
                    <div>
                      <label className="block font-medium mb-3">เลือก SOAP Request Message:</label>
                      <select
                        value={selectedMessageForExecution}
                        onChange={(e) => setSelectedMessageForExecution(parseInt(e.target.value))}
                        className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        {xmlStructure.map((msg, idx) => (
                          <option key={idx} value={idx}>
                            {msg.messageName} {msg.soapAction && `(${msg.soapAction})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* JSON Source Selection */}
                  <div>
                    <label className="block font-medium mb-3">เลือกแหล่งข้อมูล JSON:</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="jsonSource"
                          value="none"
                          checked={jsonSource === 'none'}
                          onChange={(e) => {
                            setJsonSource(e.target.value)
                            setJsonData(null)
                            setJsonFile(null)
                          }}
                        />
                        <span>ไม่ใช้ JSON (ใช้แค่ default values)</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="jsonSource"
                          value="file"
                          checked={jsonSource === 'file'}
                          onChange={(e) => setJsonSource(e.target.value)}
                        />
                        <span>Upload JSON File</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="jsonSource"
                          value="log"
                          checked={jsonSource === 'log'}
                          onChange={(e) => setJsonSource(e.target.value)}
                        />
                        <span>ดึงจาก API Log ({apiLogs.length} รายการ)</span>
                      </label>
                    </div>
                  </div>

                  {/* File Upload */}
                  {jsonSource === 'file' && (
                    <div>
                      <label className="block font-medium mb-2">เลือกไฟล์ JSON:</label>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="w-full p-2 border border-black"
                      />
                      {jsonFile && (
                        <p className="text-sm text-green-600 mt-2">✓ โหลดไฟล์สำเร็จ: {jsonFile.name}</p>
                      )}
                    </div>
                  )}

                  {/* Log Selection */}
                  {jsonSource === 'log' && (
                    <div>
                      <label className="block font-medium mb-2">เลือก Log:</label>
                      {apiLogs.length === 0 ? (
                        <p className="text-gray-500 p-4 border border-gray-300 rounded">
                          ไม่มี log สำหรับ product นี้
                        </p>
                      ) : (
                        <div className="border border-black max-h-60 overflow-auto">
                          {apiLogs.map((log) => (
                            <div
                              key={log.id}
                              onClick={() => handleLoadLog(log.id)}
                              className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                                selectedLog === log.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">App No: {log.app_no || 'N/A'}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(log.created_date).toLocaleString('th-TH')}
                                  </div>
                                </div>
                                {selectedLog === log.id && (
                                  <span className="text-blue-600 text-sm">✓ Selected</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* JSON Preview */}
                  {jsonData && (
                    <div>
                      <label className="block font-medium mb-2">JSON Data Preview:</label>
                      <pre className="p-4 bg-gray-50 border border-gray-300 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(jsonData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Execute Button */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleExecuteSOAP}
                      disabled={executing || (jsonSource === 'file' && !jsonFile) || (jsonSource === 'log' && !selectedLog)}
                      className="flex-1 px-6 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 font-medium"
                    >
                      {executing ? 'กำลัง Execute...' : '🚀 Execute SOAP Request'}
                    </button>
                    <button
                      onClick={() => setShowExecuteModal(false)}
                      className="px-6 py-3 border border-black hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Execution Result */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded ${
                      executionResult.success ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'
                    }`}>
                      <div className="font-bold text-lg">
                        {executionResult.success ? '✓ Success' : '✗ Failed'}
                      </div>
                      <div className="text-sm mt-1">
                        Status: {executionResult.status || 'N/A'}
                      </div>
                    </div>

                    {executionResult.error && (
                      <div className="p-4 bg-red-50 border border-red-300 rounded">
                        <div className="font-bold text-red-800">Error:</div>
                        <div className="text-sm text-red-700 mt-1">{executionResult.error}</div>
                      </div>
                    )}

                    {/* XML Request */}
                    <div>
                      <div className="bg-gray-800 text-white p-3 font-bold">XML Request</div>
                      <pre className="p-4 bg-gray-50 border border-gray-300 text-xs overflow-auto max-h-60">
                        {executionResult.request || 'N/A'}
                      </pre>
                    </div>

                    {/* XML Response */}
                    <div>
                      <div className="bg-gray-800 text-white p-3 font-bold">XML Response</div>
                      <pre className="p-4 bg-gray-50 border border-gray-300 text-xs overflow-auto max-h-60">
                        {typeof executionResult.response === 'string' 
                          ? executionResult.response 
                          : JSON.stringify(executionResult.response, null, 2)}
                      </pre>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => {
                          setExecutionResult(null)
                          setJsonData(null)
                          setJsonFile(null)
                          setSelectedLog(null)
                          setJsonSource('none')
                        }}
                        className="flex-1 px-6 py-3 bg-black text-white hover:bg-gray-800"
                      >
                        Execute Again
                      </button>
                      <button
                        onClick={() => setShowExecuteModal(false)}
                        className="px-6 py-3 border border-black hover:bg-gray-50"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copy Mapping Modal */}
      {showMappingCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Copy Mapping to Another Field</h3>

            {mappingToCopy && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded">
                <div className="text-sm font-medium text-gray-700 mb-2">Copying from:</div>
                <div className="text-sm">
                  <div><strong>XML Path:</strong> {mappingToCopy.xml_path}</div>
                  <div><strong>Function Type:</strong> {mappingToCopy.function_type}</div>
                  {mappingToCopy.json_field && (
                    <div><strong>JSON Field:</strong> {mappingToCopy.json_field}</div>
                  )}
                  {mappingToCopy.source === 'product' && (
                    <div className="mt-2">
                      <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded">
                        Product Override
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Target XML Field:
              </label>
              <select
                value={targetXmlPath}
                onChange={(e) => setTargetXmlPath(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="">-- Select XML Field --</option>
                {(() => {
                  const getAllLeafNodes = (nodes, result = []) => {
                    nodes.forEach(node => {
                      if (!node.children || node.children.length === 0) {
                        result.push(node)
                      } else if (node.children) {
                        getAllLeafNodes(node.children, result)
                      }
                    })
                    return result
                  }

                  if (!template?.xml_structure) return null

                  const structure = typeof template.xml_structure === 'string'
                    ? JSON.parse(template.xml_structure)
                    : template.xml_structure

                  const allLeafNodes = []
                  structure.forEach(message => {
                    if (message.structure?.children) {
                      getAllLeafNodes(message.structure.children, allLeafNodes)
                    }
                  })

                  return allLeafNodes.map((node, idx) => (
                    <option key={idx} value={node.path}>
                      {node.path} ({node.type})
                    </option>
                  ))
                })()}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowMappingCopyModal(false)
                  setMappingToCopy(null)
                  setTargetXmlPath('')
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCopyMapping}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Copy & Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
