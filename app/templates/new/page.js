'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TreeNode from '../../components/TreeNode'

export default function NewTemplatePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    template_name: '',
    wsdl_url: '',
    soap_endpoint: '',
    soap_user: '',
    soap_password: ''
  })
  const [xmlStructure, setXmlStructure] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(0)

  const handleLoadWSDL = async () => {
    if (!formData.wsdl_url) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/wsdl/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wsdl_url: formData.wsdl_url })
      })
      const data = await res.json()
      
      if (data.error) {
        alert('Error: ' + data.error)
      } else {
        setXmlStructure(data.structure)
        setSelectedMessage(0)
        
        // Auto-fill SOAP endpoint if found
        if (data.soap_endpoint) {
          setFormData({...formData, soap_endpoint: data.soap_endpoint})
        }
      }
    } catch (error) {
      alert('Error loading WSDL: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          xml_structure: xmlStructure
        })
      })
      
      if (res.ok) {
        router.push('/templates')
      } else {
        const error = await res.json()
        alert('Error: ' + (error.error || 'Failed to create template'))
      }
    } catch (error) {
      alert('Error creating template: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">สร้าง Template ใหม่</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 border border-black">
            <h2 className="text-xl font-bold mb-4">ข้อมูล Template</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">ชื่อ Template</label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">WSDL URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.wsdl_url}
                    onChange={(e) => setFormData({...formData, wsdl_url: e.target.value})}
                    className="flex-1 p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleLoadWSDL}
                    disabled={loading}
                    className="px-6 py-3 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 whitespace-nowrap"
                  >
                    {loading ? 'กำลังโหลด...' : 'Load WSDL'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium">SOAP Endpoint URL</label>
                <input
                  type="url"
                  value={formData.soap_endpoint}
                  onChange={(e) => setFormData({...formData, soap_endpoint: e.target.value})}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="URL สำหรับ call SOAP (จะถูก auto-fill จาก WSDL)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL นี้จะใช้ในการ execute SOAP request
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium">SOAP User</label>
                  <input
                    type="text"
                    value={formData.soap_user}
                    onChange={(e) => setFormData({...formData, soap_user: e.target.value})}
                    className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">SOAP Password</label>
                  <input
                    type="password"
                    value={formData.soap_password}
                    onChange={(e) => setFormData({...formData, soap_password: e.target.value})}
                    className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {xmlStructure && xmlStructure.length > 0 && (
            <div className="bg-white border border-black">
              <div className="bg-black text-white p-4">
                <h3 className="font-bold text-lg">XML Request Structure</h3>
              </div>

              {/* Message Selector */}
              {xmlStructure.length > 1 && (
                <div className="p-4 border-b border-black">
                  <label className="block mb-2 font-medium">เลือก Request Message:</label>
                  <select
                    value={selectedMessage}
                    onChange={(e) => setSelectedMessage(parseInt(e.target.value))}
                    className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {xmlStructure.map((msg, idx) => (
                      <option key={idx} value={idx}>
                        {msg.messageName} {msg.soapAction && `(${msg.soapAction})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tree View */}
              <div className="p-4 max-h-96 overflow-auto">
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">คำอธิบาย:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">string</span>
                      <span className="text-gray-600">= ข้อมูลพื้นฐาน</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">complex</span>
                      <span className="text-gray-600">= กลุ่มข้อมูล</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">[]</span>
                      <span className="text-gray-600">= Array</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">*</span>
                      <span className="text-gray-600">= Required</span>
                    </div>
                  </div>
                </div>

                <TreeNode 
                  node={xmlStructure[selectedMessage].structure} 
                  onSelect={(node) => console.log('Selected:', node)}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !xmlStructure}
              className="px-6 py-3 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
            >
              บันทึก Template
            </button>
            <button
              type="button"
              onClick={() => router.push('/templates')}
              className="px-6 py-3 border border-black hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
