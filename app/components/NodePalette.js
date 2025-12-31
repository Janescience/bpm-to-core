'use client'

import { useState } from 'react'

const NODE_TYPES = {
  product: { color: 'bg-blue-100 border-blue-300 text-blue-800', icon: '📦' },
  template: { color: 'bg-purple-100 border-purple-300 text-purple-800', icon: '📋' },
  custom: { color: 'bg-green-100 border-green-300 text-green-800', icon: '⚙️' }
}

export default function NodePalette({ availableNodes, onNodeAdd }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newNode, setNewNode] = useState({
    name: '',
    type: 'custom',
    api_path: '',
    database_table: '',
    external_api_url: ''
  })

  const filteredNodes = availableNodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || node.type === selectedType
    return matchesSearch && matchesType
  })

  const handleDragStart = (e, node) => {
    e.dataTransfer.setData('application/json', JSON.stringify(node))
  }

  const createCustomNode = async (e) => {
    e.preventDefault()
    if (!newNode.name.trim()) return

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNode),
      })

      if (res.ok) {
        const createdNode = await res.json()
        setNewNode({
          name: '',
          type: 'custom',
          api_path: '',
          database_table: '',
          external_api_url: ''
        })
        setShowCreateForm(false)
        window.location.reload()
      }
    } catch (error) {
      console.error('Error creating node:', error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold mb-3">Node Library</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="ค้นหา nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-3"
        />

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-3"
        >
          <option value="all">ทุกประเภท</option>
          <option value="product">Products</option>
          <option value="template">Templates</option>
          <option value="custom">Custom Nodes</option>
        </select>

        {/* Create Custom Node Button */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + สร้าง Custom Node
        </button>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredNodes.map((node) => {
            const nodeType = NODE_TYPES[node.type] || NODE_TYPES.custom

            return (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node)}
                className={`p-3 border-2 border-dashed rounded-lg cursor-move hover:shadow-md transition-shadow ${nodeType.color}`}
                title={`Drag to canvas to add ${node.name}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{nodeType.icon}</span>
                  <span className="font-medium text-sm">{node.name}</span>
                </div>
                <div className="text-xs opacity-75">
                  {node.type.toUpperCase()}
                </div>
                {node.api_path && (
                  <div className="text-xs opacity-75 mt-1">
                    API: {node.api_path}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredNodes.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            ไม่พบ nodes ที่ตรงกับเงื่อนไข
          </div>
        )}
      </div>

      {/* Create Custom Node Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">สร้าง Custom Node</h2>
            <form onSubmit={createCustomNode}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">ชื่อ Node</label>
                <input
                  type="text"
                  value={newNode.name}
                  onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">ประเภท</label>
                <select
                  value={newNode.type}
                  onChange={(e) => setNewNode({ ...newNode, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="custom">Custom</option>
                  <option value="product">Product</option>
                  <option value="template">Template</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">API Path (ไม่จำเป็น)</label>
                <input
                  type="text"
                  value={newNode.api_path}
                  onChange={(e) => setNewNode({ ...newNode, api_path: e.target.value })}
                  placeholder="/api/custom-endpoint"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Database Table (ไม่จำเป็น)</label>
                <input
                  type="text"
                  value={newNode.database_table}
                  onChange={(e) => setNewNode({ ...newNode, database_table: e.target.value })}
                  placeholder="table_name"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">External API URL (ไม่จำเป็น)</label>
                <input
                  type="url"
                  value={newNode.external_api_url}
                  onChange={(e) => setNewNode({ ...newNode, external_api_url: e.target.value })}
                  placeholder="https://api.example.com/endpoint"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700"
                >
                  สร้าง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drop Zone Instructions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          ลากและวาง nodes ลงใน canvas<br />
          เพื่อเพิ่มลงใน flow
        </div>
      </div>
    </div>
  )
}