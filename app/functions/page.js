'use client'

import { useState, useEffect } from 'react'

export default function CustomFunctionsPage() {
  const [functions, setFunctions] = useState([])
  const [selectedFunction, setSelectedFunction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    function_name: '',
    description: '',
    code: '',
    parameters: [],
    is_active: true,
    created_by: 'User'
  })

  // Parameter form
  const [paramName, setParamName] = useState('')
  const [paramType, setParamType] = useState('string')
  const [paramDesc, setParamDesc] = useState('')

  useEffect(() => {
    loadFunctions()
  }, [showActiveOnly])

  const loadFunctions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/functions?active_only=${showActiveOnly}`)
      const data = await response.json()

      if (data.success) {
        setFunctions(data.data)
      }
    } catch (error) {
      console.error('Error loading functions:', error)
      alert('Error loading functions')
    } finally {
      setLoading(false)
    }
  }

  const loadFunctionDetails = async (functionName) => {
    try {
      const response = await fetch(`/api/functions?function_name=${encodeURIComponent(functionName)}`)
      const data = await response.json()

      if (data.success) {
        const func = data.data
        setFormData({
          id: func.id,
          function_name: func.function_name,
          description: func.description || '',
          code: func.code,
          parameters: typeof func.parameters === 'string' ? JSON.parse(func.parameters) : func.parameters,
          is_active: func.is_active,
          created_by: func.created_by
        })
        setSelectedFunction(func)
        setShowEditor(true)
      }
    } catch (error) {
      console.error('Error loading function details:', error)
      alert('Error loading function details')
    }
  }

  const handleAddParameter = () => {
    if (!paramName) {
      alert('Parameter name is required')
      return
    }

    const newParam = {
      name: paramName,
      type: paramType,
      description: paramDesc
    }

    setFormData({
      ...formData,
      parameters: [...formData.parameters, newParam]
    })

    setParamName('')
    setParamType('string')
    setParamDesc('')
  }

  const handleRemoveParameter = (index) => {
    setFormData({
      ...formData,
      parameters: formData.parameters.filter((_, i) => i !== index)
    })
  }

  const handleSave = async () => {
    if (!formData.function_name || !formData.code) {
      alert('Function name and code are required')
      return
    }

    try {
      const method = formData.id ? 'PUT' : 'POST'
      const response = await fetch('/api/functions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        alert(formData.id ? 'Function updated!' : 'Function created!')
        setShowEditor(false)
        setSelectedFunction(null)
        resetForm()
        await loadFunctions()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving function:', error)
      alert('Error saving function')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this function? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/functions?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert('Function deleted!')
        await loadFunctions()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting function:', error)
      alert('Error deleting function')
    }
  }

  const handleNewFunction = () => {
    resetForm()
    setShowEditor(true)
  }

  const resetForm = () => {
    setFormData({
      function_name: '',
      description: '',
      code: '',
      parameters: [],
      is_active: true,
      created_by: 'User'
    })
    setSelectedFunction(null)
  }

  const handleTestFunction = () => {
    try {
      const testData = prompt('Enter test JSON data:', '{"field": "test"}')
      if (!testData) return

      const data = JSON.parse(testData)
      const func = new Function('data', 'params', formData.code)
      const result = func(data, {})

      alert('Test Result:\n' + JSON.stringify(result, null, 2))
    } catch (error) {
      alert('Test Error: ' + error.message)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Custom Functions</h1>
          <p className="text-gray-600 mt-1">Manage user-defined transformation functions</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
            <span className="text-sm">Active only</span>
          </label>
          <button
            onClick={handleNewFunction}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Function
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Functions List */}
        <div className="col-span-4 bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Functions ({functions.length})</h2>

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : functions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No functions found. Click "New Function" to create one.
              </div>
            ) : (
              functions.map((func) => (
                <div
                  key={func.id}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedFunction?.id === func.id ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                  onClick={() => loadFunctionDetails(func.function_name)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{func.function_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{func.description}</div>
                    </div>
                    {!func.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right content - Function Editor */}
        <div className="col-span-8">
          {!showEditor ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
              <div className="text-4xl mb-4">⚡</div>
              <div className="text-xl mb-2">Custom Transformation Functions</div>
              <div className="text-sm">
                Select a function from the left or create a new one
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  {formData.id ? 'Edit Function' : 'New Function'}
                </h2>
                <button
                  onClick={() => {
                    setShowEditor(false)
                    resetForm()
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Function Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Function Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.function_name}
                    onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                    placeholder="e.g., calculateAge, formatAddress"
                    className="w-full border rounded px-3 py-2 font-mono"
                    disabled={!!formData.id}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alphanumeric and underscore only. Cannot be changed after creation.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does this function do?"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                {/* Parameters */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Parameters
                  </label>

                  {formData.parameters.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {formData.parameters.map((param, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="font-mono text-sm">{param.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                            {param.description && (
                              <div className="text-xs text-gray-600 mt-1">{param.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveParameter(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={paramName}
                      onChange={(e) => setParamName(e.target.value)}
                      placeholder="Parameter name"
                      className="col-span-4 border rounded px-3 py-2 text-sm"
                    />
                    <select
                      value={paramType}
                      onChange={(e) => setParamType(e.target.value)}
                      className="col-span-2 border rounded px-3 py-2 text-sm"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="object">object</option>
                      <option value="array">array</option>
                    </select>
                    <input
                      type="text"
                      value={paramDesc}
                      onChange={(e) => setParamDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="col-span-5 border rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={handleAddParameter}
                      className="col-span-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* JavaScript Code */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    JavaScript Code <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={`// Available variables:\n// - data: The JSON data object\n// - params: Function parameters\n\n// Example:\nconst value = data.fieldName;\nreturn value ? value.toUpperCase() : '';`}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                    rows={15}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      Must return a value. Use 'data' for JSON input, 'params' for parameters.
                    </p>
                    <button
                      onClick={handleTestFunction}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      🧪 Test Function
                    </button>
                  </div>
                </div>

                {/* Is Active */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Inactive functions cannot be used in mappings
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {formData.id ? 'Update Function' : 'Create Function'}
                  </button>
                  {formData.id && (
                    <button
                      onClick={() => handleDelete(formData.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowEditor(false)
                      resetForm()
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">💡 How to use Custom Functions</h3>

        <div className="space-y-4 text-sm text-blue-800">
          <div>
            <strong>1. Create your function:</strong> Write JavaScript code that processes data and returns a value.
          </div>

          <div>
            <strong>2. Available variables:</strong>
            <ul className="list-disc ml-6 mt-1">
              <li><code className="bg-blue-100 px-1">data</code> - The complete JSON data object</li>
              <li><code className="bg-blue-100 px-1">params</code> - Parameters passed from mapping configuration</li>
            </ul>
          </div>

          <div>
            <strong>3. Example function:</strong>
            <pre className="bg-blue-100 p-3 rounded mt-2 overflow-x-auto">
{`// Function: calculateAge
const birthDate = new Date(data.birthDate);
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
const monthDiff = today.getMonth() - birthDate.getMonth();
if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
  age--;
}
return age.toString();`}
            </pre>
          </div>

          <div>
            <strong>4. Using in mappings:</strong> Select function type "CUSTOM" and provide the function name in parameters.
          </div>
        </div>
      </div>
    </div>
  )
}
