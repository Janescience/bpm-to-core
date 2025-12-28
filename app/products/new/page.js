'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState([])
  const [formData, setFormData] = useState({
    product_name: '',
    template_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      if (Array.isArray(data)) {
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: parseInt(formData.template_id),
          product_name: formData.product_name
        })
      })
      
      if (res.ok) {
        const product = await res.json()
        router.push(`/products/${product.id}`)
      } else {
        const error = await res.json()
        alert('Error: ' + (error.error || 'Failed to create product'))
      }
    } catch (error) {
      alert('Error creating product: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingTemplates) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">สร้าง Product ใหม่</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 border border-black">
            <h2 className="text-xl font-bold mb-4">ข้อมูล Product</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">ชื่อ Product</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="เช่น Product A, Plan X"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">เลือก Template</label>
                <select
                  value={formData.template_id}
                  onChange={(e) => setFormData({...formData, template_id: e.target.value})}
                  className="w-full p-3 border border-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="">-- เลือก Template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    ยังไม่มี Template กรุณาสร้าง Template ก่อน
                  </p>
                )}
              </div>

              {formData.template_id && (
                <div className="p-4 bg-blue-50 border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <strong>หมายเหตุ:</strong> Product นี้จะใช้ mapping จาก template ที่เลือก 
                    และสามารถ override mapping เฉพาะส่วนที่ต้องการได้ในหน้าถัดไป
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || templates.length === 0}
              className="px-6 py-3 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
            >
              {loading ? 'กำลังสร้าง...' : 'สร้าง Product'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/products')}
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
