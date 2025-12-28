'use client'

import { useState, useEffect } from 'react'

export default function ConfigManagementPage() {
  const [configKeys, setConfigKeys] = useState([])
  const [selectedKey, setSelectedKey] = useState('')
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    bpm_key: '',
    input: '',
    output: '',
    description: '',
    system_type: 'NL'
  })

  // Load all config keys on mount
  useEffect(() => {
    loadConfigKeys()
  }, [])

  // Load configs when selectedKey changes
  useEffect(() => {
    if (selectedKey) {
      loadConfigs(selectedKey)
    }
  }, [selectedKey])

  const loadConfigKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/config')
      const data = await response.json()

      if (data.success) {
        setConfigKeys(data.data)
      }
    } catch (error) {
      console.error('Error loading config keys:', error)
      alert('Error loading config keys')
    } finally {
      setLoading(false)
    }
  }

  const loadConfigs = async (bpmKey) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/config?bpm_key=${bpmKey}`)
      const data = await response.json()

      if (data.success) {
        setConfigs(data.data)
      }
    } catch (error) {
      console.error('Error loading configs:', error)
      alert('Error loading configs')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()

    try {
      const method = editingConfig ? 'PUT' : 'POST'
      const response = await fetch('/api/config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        alert(editingConfig ? 'Config updated!' : 'Config created!')
        setShowAddForm(false)
        setEditingConfig(null)
        setFormData({ bpm_key: '', input: '', output: '', description: '', system_type: 'NL' })

        // Reload
        await loadConfigKeys()
        if (selectedKey) {
          await loadConfigs(selectedKey)
        }
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Error saving config')
    }
  }

  const handleEdit = (config) => {
    setEditingConfig(config)
    setFormData({
      bpm_key: config.bpm_key,
      input: config.input,
      output: config.output,
      description: config.description || '',
      system_type: config.system_type
    })
    setShowAddForm(true)
  }

  const handleDelete = async (config) => {
    if (!confirm(`Delete config: ${config.input} → ${config.output}?`)) return

    try {
      const response = await fetch(`/api/config?id=${config.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert('Config deleted!')
        await loadConfigKeys()
        if (selectedKey) {
          await loadConfigs(selectedKey)
        }
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting config:', error)
      alert('Error deleting config')
    }
  }

  const handleAddNew = () => {
    setEditingConfig(null)
    setFormData({
      bpm_key: selectedKey || '',
      input: '',
      output: '',
      description: '',
      system_type: 'NL'
    })
    setShowAddForm(true)
  }

  const handleBatchImport = async () => {
    const jsonInput = prompt('Paste JSON array of configs:\n[{"input":"101","output":"นาย","description":"Mr."},...]')

    if (!jsonInput) return

    try {
      const mappings = JSON.parse(jsonInput)
      const bpmKey = selectedKey || prompt('Enter BPM Key:')

      if (!bpmKey) return

      const response = await fetch('/api/config/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bpm_key: bpmKey,
          system_type: 'NL',
          mappings
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Imported ${data.inserted} configs!`)
        await loadConfigKeys()
        if (selectedKey) {
          await loadConfigs(selectedKey)
        }
      } else {
        alert(`Imported ${data.inserted}, Errors: ${data.errors}\n${JSON.stringify(data.errorDetails, null, 2)}`)
      }
    } catch (error) {
      console.error('Error batch importing:', error)
      alert('Invalid JSON or error importing')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configuration Management</h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Config Keys */}
        <div className="col-span-3 bg-white shadow rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Config Keys</h2>
            <button
              onClick={loadConfigKeys}
              className="text-blue-600 hover:text-blue-800"
              disabled={loading}
            >
              {loading ? '⟳' : '↻'}
            </button>
          </div>

          <div className="space-y-2">
            {configKeys.map((key) => (
              <button
                key={`${key.bpm_key}-${key.system_type}`}
                onClick={() => setSelectedKey(key.bpm_key)}
                className={`w-full text-left px-3 py-2 rounded ${
                  selectedKey === key.bpm_key
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{key.bpm_key}</div>
                <div className="text-xs text-gray-500">
                  {key.count} items • {key.system_type}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleBatchImport}
            className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Batch Import
          </button>
        </div>

        {/* Right content - Config values */}
        <div className="col-span-9">
          {!selectedKey ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
              Select a config key from the left sidebar
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">{selectedKey}</h2>
                <button
                  onClick={handleAddNew}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  + Add New
                </button>
              </div>

              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="mb-6 p-4 border rounded bg-gray-50">
                  <h3 className="text-lg font-medium mb-4">
                    {editingConfig ? 'Edit Config' : 'Add New Config'}
                  </h3>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          BPM Key *
                        </label>
                        <input
                          type="text"
                          value={formData.bpm_key}
                          onChange={(e) => setFormData({ ...formData, bpm_key: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          System Type
                        </label>
                        <select
                          value={formData.system_type}
                          onChange={(e) => setFormData({ ...formData, system_type: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="NL">NL (New Life)</option>
                          <option value="GL">GL (Group Life)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Input (AS400 Code) *
                        </label>
                        <input
                          type="text"
                          value={formData.input}
                          onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="101"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Output (BPM Value) *
                        </label>
                        <input
                          type="text"
                          value={formData.output}
                          onChange={(e) => setFormData({ ...formData, output: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="นาย"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Mr."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        {editingConfig ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingConfig(null)
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2">Input</th>
                      <th className="text-left px-4 py-2">Output</th>
                      <th className="text-left px-4 py-2">Description</th>
                      <th className="text-left px-4 py-2">System</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          No configs found. Click "Add New" to create one.
                        </td>
                      </tr>
                    ) : (
                      configs.map((config) => (
                        <tr key={config.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono">{config.input}</td>
                          <td className="px-4 py-3">{config.output}</td>
                          <td className="px-4 py-3 text-gray-600">{config.description}</td>
                          <td className="px-4 py-3">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {config.system_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleEdit(config)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(config)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
