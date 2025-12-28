'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TreeNode from '../../components/TreeNode'
import MappingForm from '../../components/MappingForm'

export default function TemplateDetailPage({ params }) {
  const router = useRouter()
  const [template, setTemplate] = useState(null)
  const [mappings, setMappings] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(0)
  const [reloadingWSDL, setReloadingWSDL] = useState(false)
  const [versionLogs, setVersionLogs] = useState([])
  const [showVersions, setShowVersions] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTemplateName, setCopyTemplateName] = useState('')
  const [copyWsdlUrl, setCopyWsdlUrl] = useState('')
  const [copying, setCopying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMappingCopyModal, setShowMappingCopyModal] = useState(false)
  const [mappingToCopy, setMappingToCopy] = useState(null)
  const [targetXmlPath, setTargetXmlPath] = useState('')

  useEffect(() => {
    loadTemplate()
    loadMappings()
    loadVersionLogs()
  }, [])

  const loadTemplate = async () => {
    try {
      const id = (await params).id
      const res = await fetch(`/api/templates/${id}`)
      const data = await res.json()
      setTemplate(data)
    } catch (error) {
      console.error('Error loading template:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMappings = async () => {
    try {
      const id = (await params).id
      const res = await fetch(`/api/mappings/template?template_id=${id}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setMappings(data)
      }
    } catch (error) {
      console.error('Error loading mappings:', error)
    }
  }

  const loadVersionLogs = async () => {
    try {
      const id = (await params).id
      const res = await fetch(`/api/templates/versions?template_id=${id}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setVersionLogs(data)
      }
    } catch (error) {
      console.error('Error loading version logs:', error)
    }
  }

  const handleNodeSelect = (node) => {
    // Only allow selection of leaf nodes (fields without children)
    if (!node.children || node.children.length === 0) {
      setSelectedNode(node)
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
          setSelectedNode({ ...node, existingMapping: mapping })
          break
        }
      }
    }
  }

  const handleSaveMapping = (mapping) => {
    // Update or add mapping
    const existingIndex = mappings.findIndex(m => m.xml_path === mapping.xml_path)
    if (existingIndex >= 0) {
      const updated = [...mappings]
      updated[existingIndex] = mapping
      setMappings(updated)
    } else {
      setMappings([...mappings, mapping])
    }

    // Reset selection
    setSelectedNode(null)
  }

  const handleRemoveMapping = (xmlPath) => {
    setMappings(mappings.filter(m => m.xml_path !== xmlPath))
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
    const newMapping = {
      ...mappingToCopy,
      xml_path: targetXmlPath,
      xml_name: targetNode.name,
      xml_type: targetNode.type,
      is_required: targetNode.required || false
    }

    // Open the form with this mapping
    setSelectedNode({ ...targetNode, existingMapping: newMapping })
    setShowMappingCopyModal(false)
    setMappingToCopy(null)
    setTargetXmlPath('')
  }

  const handleSaveMappings = async () => {
    setSaving(true)
    try {
      const id = (await params).id
      const mappingsToSave = mappings.map(m => ({
        template_id: parseInt(id),
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

      const res = await fetch('/api/mappings/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingsToSave)
      })

      if (res.ok) {
        alert('บันทึก Mapping สำเร็จ')
        loadMappings()
      } else {
        const error = await res.json()
        alert('Error: ' + (error.error || 'Failed to save mappings'))
      }
    } catch (error) {
      alert('Error saving mappings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReloadWSDL = async () => {
    if (!confirm('ต้องการ reload WSDL structure ใหม่? (mapping เดิมจะถูกเก็บไว้)')) {
      return
    }

    setReloadingWSDL(true)
    try {
      const id = (await params).id
      
      // Parse WSDL again
      const parseRes = await fetch('/api/wsdl/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wsdl_url: template.wsdl_url })
      })
      
      const parseData = await parseRes.json()
      
      if (!parseData.success) {
        throw new Error(parseData.error || 'Failed to parse WSDL')
      }
      
      // Compare old and new structure
      const oldStructure = template.xml_structure
      const newStructure = parseData.structure
      const changes = compareStructures(oldStructure, newStructure)
      
      // Only update if there are changes
      if (changes.hasChanges) {
        // Update template with new structure
        await fetch(`/api/templates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_name: template.template_name,
            wsdl_url: template.wsdl_url,
            soap_user: template.soap_user,
            soap_password: template.soap_password,
            xml_structure: parseData.structure
          })
        })
        
        // Log version changes
        await fetch('/api/templates/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: parseInt(id),
            changes: {
              added_fields: changes.addedFields,
              removed_fields: changes.removedFields,
              modified_fields: changes.modifiedFields,
              summary: changes.summary
            },
            updated_by: 'User'
          })
        })
        
        // Reload template and version logs
        await loadTemplate()
        await loadVersionLogs()
        alert(`Reload WSDL structure สำเร็จ!\n\n${changes.summary}`)
      } else {
        alert('ไม่มีการเปลี่ยนแปลง structure')
      }
    } catch (error) {
      alert('Error reloading WSDL: ' + error.message)
    } finally {
      setReloadingWSDL(false)
    }
  }

  const compareStructures = (oldStructure, newStructure) => {
    const oldPaths = new Set()
    const newPaths = new Set()
    const oldFieldMap = new Map()
    const newFieldMap = new Map()
    
    // Extract all paths from old structure
    const extractPaths = (node, pathSet, fieldMap) => {
      if (!node) return
      
      if (Array.isArray(node)) {
        node.forEach(n => extractPaths(n.structure || n, pathSet, fieldMap))
        return
      }
      
      if (node.path) {
        pathSet.add(node.path)
        fieldMap.set(node.path, {
          name: node.name,
          type: node.type,
          required: node.required
        })
      }
      
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => extractPaths(child, pathSet, fieldMap))
      }
    }
    
    extractPaths(oldStructure, oldPaths, oldFieldMap)
    extractPaths(newStructure, newPaths, newFieldMap)
    
    // Find differences
    const addedFields = Array.from(newPaths).filter(p => !oldPaths.has(p))
    const removedFields = Array.from(oldPaths).filter(p => !newPaths.has(p))
    const modifiedFields = []
    
    // Check for modifications in common fields
    Array.from(newPaths).filter(p => oldPaths.has(p)).forEach(path => {
      const oldField = oldFieldMap.get(path)
      const newField = newFieldMap.get(path)
      if (JSON.stringify(oldField) !== JSON.stringify(newField)) {
        modifiedFields.push({
          path,
          old: oldField,
          new: newField
        })
      }
    })
    
    const hasChanges = addedFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0
    
    let summary = ''
    if (addedFields.length > 0) summary += `เพิ่ม: ${addedFields.length} fields\n`
    if (removedFields.length > 0) summary += `ลบ: ${removedFields.length} fields\n`
    if (modifiedFields.length > 0) summary += `แก้ไข: ${modifiedFields.length} fields\n`
    
    return {
      hasChanges,
      addedFields,
      removedFields,
      modifiedFields,
      summary: summary || 'ไม่มีการเปลี่ยนแปลง'
    }
  }

  const handleCopyTemplate = async () => {
    if (!copyTemplateName || !copyWsdlUrl) {
      alert('กรุณากรอกชื่อ Template และ WSDL URL')
      return
    }

    setCopying(true)
    try {
      const id = (await params).id
      
      const res = await fetch('/api/templates/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_template_id: parseInt(id),
          new_template_name: copyTemplateName,
          new_wsdl_url: copyWsdlUrl
        })
      })
      
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to copy template')
      }
      
      alert(
        `Copy Template สำเร็จ!\n\n` +
        `คัดลอก Mappings: ${data.copied_mappings}/${data.total_source_mappings} fields\n` +
        `Structure ใหม่มี: ${data.total_new_fields} fields\n\n` +
        `กำลังนำทางไปยัง template ใหม่...`
      )
      
      // Navigate to new template
      router.push(`/templates/${data.new_template.id}`)
      
    } catch (error) {
      alert('Error copying template: ' + error.message)
    } finally {
      setCopying(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  if (!template) {
    return <div className="min-h-screen flex items-center justify-center">ไม่พบข้อมูล Template</div>
  }

  const xmlStructure = typeof template.xml_structure === 'string' 
    ? JSON.parse(template.xml_structure) 
    : template.xml_structure

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{template.template_name}</h1>
            <p className="text-gray-600 mt-2">{template.wsdl_url}</p>
            {versionLogs.length > 0 && (
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                📋 Version History ({versionLogs.length} versions)
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCopyModal(true)}
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700"
            >
              📋 Copy Template
            </button>
            <button
              onClick={handleReloadWSDL}
              disabled={reloadingWSDL}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {reloadingWSDL ? '🔄 กำลัง Reload...' : '🔄 Reload WSDL'}
            </button>
            <button
              onClick={() => router.push('/templates')}
              className="px-4 py-2 border border-black hover:bg-gray-50"
            >
              ← กลับ
            </button>
          </div>
        </div>

        {/* Version History Modal */}
        {showVersions && (
          <div className="mb-6 bg-white border border-black p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Version History</h3>
              <button
                onClick={() => setShowVersions(false)}
                className="text-2xl hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-auto">
              {versionLogs.map((log) => (
                <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-lg">Version {log.version_number}</span>
                      <span className="text-sm text-gray-600 ml-3">
                        {new Date(log.updated_at).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {log.updated_by || 'System'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    {log.changes.added_fields && log.changes.added_fields.length > 0 && (
                      <div className="text-green-700">
                        ✅ เพิ่ม: {log.changes.added_fields.length} fields
                        <div className="ml-4 text-xs text-gray-600 mt-1">
                          {log.changes.added_fields.slice(0, 5).join(', ')}
                          {log.changes.added_fields.length > 5 && ` และอีก ${log.changes.added_fields.length - 5} fields`}
                        </div>
                      </div>
                    )}
                    {log.changes.removed_fields && log.changes.removed_fields.length > 0 && (
                      <div className="text-red-700">
                        ❌ ลบ: {log.changes.removed_fields.length} fields
                        <div className="ml-4 text-xs text-gray-600 mt-1">
                          {log.changes.removed_fields.slice(0, 5).join(', ')}
                          {log.changes.removed_fields.length > 5 && ` และอีก ${log.changes.removed_fields.length - 5} fields`}
                        </div>
                      </div>
                    )}
                    {log.changes.modified_fields && log.changes.modified_fields.length > 0 && (
                      <div className="text-orange-700">
                        🔄 แก้ไข: {log.changes.modified_fields.length} fields
                      </div>
                    )}
                    {log.changes.summary && (
                      <div className="text-gray-700 mt-2 italic">
                        {log.changes.summary}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Copy Template Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white max-w-2xl w-full mx-4 border border-black">
              <div className="bg-black text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">📋 Copy Template</h2>
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="text-white hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <h3 className="font-bold text-blue-900 mb-2">📌 คัดลอกจาก:</h3>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">{template.template_name}</div>
                    <div className="text-xs mt-1 break-all">{template.wsdl_url}</div>
                    <div className="mt-2 text-xs">
                      Mappings: {mappings.length} fields
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    ชื่อ Template ใหม่ <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={copyTemplateName}
                    onChange={(e) => setCopyTemplateName(e.target.value)}
                    placeholder="เช่น E2ENACT2 Template"
                    className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    WSDL URL ใหม่ <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={copyWsdlUrl}
                    onChange={(e) => setCopyWsdlUrl(e.target.value)}
                    placeholder="http://..."
                    className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    💡 Mappings ที่มี xml_path ตรงกันจะถูกคัดลอกมา fields ใหม่สามารถ map เพิ่มได้ภายหลัง
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <div className="text-sm text-yellow-800">
                    <strong>หมายเหตุ:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>ระบบจะ parse WSDL ใหม่และสร้าง structure ใหม่</li>
                      <li>Mappings ที่ตรงกับ structure ใหม่จะถูกคัดลอกไปด้วย</li>
                      <li>User/Password จะถูกคัดลอกจาก template เดิม</li>
                      <li>Fields ใหม่ที่ไม่มีในเดิมจะต้อง map เพิ่มเอง</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopyTemplate}
                    disabled={copying || !copyTemplateName || !copyWsdlUrl}
                    className="flex-1 px-4 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 font-medium"
                  >
                    {copying ? '📋 กำลัง Copy...' : '✅ Copy Template'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCopyModal(false)
                      setCopyTemplateName('')
                      setCopyWsdlUrl('')
                    }}
                    disabled={copying}
                    className="px-4 py-3 border border-black hover:bg-gray-50 disabled:bg-gray-200"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Left: XML Structure Tree */}
          <div className="bg-white border border-black">
            <div className="bg-black text-white p-4">
              <h3 className="font-bold text-lg">XML Request Structure</h3>
              <p className="text-sm text-gray-300 mt-1">คลิกที่ field เพื่อ map</p>
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

                <div className="p-4 max-h-[1000px] overflow-auto">
                  <TreeNode 
                    node={xmlStructure[selectedMessage].structure} 
                    onSelect={handleNodeSelect}
                    selectedPath={selectedNode?.path}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right: Mapping Form & List */}
          <div className="space-y-6">
            {/* Mapping Form */}
            {selectedNode && (
              <MappingForm
                selectedNode={selectedNode}
                existingMapping={selectedNode.existingMapping || mappings.find(m => m.xml_path === selectedNode.path)}
                onSave={handleSaveMapping}
                onCancel={() => setSelectedNode(null)}
              />
            )}

            {/* Mappings List */}
            <div className="bg-white border border-black">
              <div className="bg-black text-white p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-lg">Field Mappings ({mappings.length})</h3>
                  <button
                    onClick={handleSaveMappings}
                    disabled={saving || mappings.length === 0}
                    className="px-4 py-2 bg-white text-black hover:bg-gray-200 disabled:bg-gray-400 disabled:text-gray-600 text-sm"
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                  </button>
                </div>

                {/* Search Field */}
                {mappings.length > 0 && (
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

              <div className="max-h-[1000px] overflow-auto">
                {mappings.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    ยังไม่มี Mapping<br/>
                    <span className="text-sm">เลือก field จาก XML structure เพื่อเริ่ม map</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {mappings
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
                      <div key={index} className="p-4 hover:bg-gray-50 group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{mapping.xml_name}</span>
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
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                {mapping.xml_type}
                              </span>
                              {mapping.is_required && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditMapping(mapping)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title="Edit mapping"
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
                            <button
                              onClick={() => handleRemoveMapping(mapping.xml_path)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove mapping"
                            >
                              ✕
                            </button>
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
