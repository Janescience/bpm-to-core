'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTemplates(data)
      } else if (data.error) {
        console.error('API Error:', data.error)
        setTemplates([])
      } else {
        setTemplates([])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Templates</h1>
          <Link href="/templates/new" className="px-4 py-2 bg-black text-white hover:bg-gray-800">
            + สร้าง Template ใหม่
          </Link>
        </div>

        <div className="border border-black">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-4 text-left">ชื่อ Template</th>
                <th className="p-4 text-left">WSDL URL</th>
                <th className="p-4 text-left">วันที่สร้าง</th>
                <th className="p-4 text-left">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    ไม่มีข้อมูล Template
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="border-t border-black hover:bg-gray-50">
                    <td className="p-4">{template.template_name}</td>
                    <td className="p-4 text-sm text-gray-600 truncate max-w-md">{template.wsdl_url}</td>
                    <td className="p-4">{new Date(template.created_date).toLocaleDateString('th-TH')}</td>
                    <td className="p-4">
                      <Link href={`/templates/${template.id}`} className="underline hover:no-underline">
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
