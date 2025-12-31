'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function FlowsPage() {
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFlow, setNewFlow] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchFlows()
  }, [])

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flows')
      const data = await res.json()
      if (Array.isArray(data)) {
        setFlows(data)
      } else {
        console.error('API Error:', data.error)
        setFlows([])
      }
    } catch (error) {
      console.error('Error fetching flows:', error)
      setFlows([])
    } finally {
      setLoading(false)
    }
  }

  const createFlow = async (e) => {
    e.preventDefault()
    if (!newFlow.name.trim()) return

    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFlow),
      })

      if (res.ok) {
        await fetchFlows()
        setNewFlow({ name: '', description: '' })
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('Error creating flow:', error)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Flow Charts</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800"
          >
            + สร้าง Flow ใหม่
          </button>
        </div>

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">สร้าง Flow ใหม่</h2>
              <form onSubmit={createFlow}>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">ชื่อ Flow</label>
                  <input
                    type="text"
                    value={newFlow.name}
                    onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">คำอธิบาย</label>
                  <textarea
                    value={newFlow.description}
                    onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded h-20"
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
                    className="px-4 py-2 bg-black text-white hover:bg-gray-800"
                  >
                    สร้าง
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="border border-black">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-4 text-left">ชื่อ Flow</th>
                <th className="p-4 text-left">คำอธิบาย</th>
                <th className="p-4 text-left">จำนวน Node</th>
                <th className="p-4 text-left">สถานะ</th>
                <th className="p-4 text-left">วันที่สร้าง</th>
                <th className="p-4 text-left">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {flows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    ไม่มีข้อมูล Flow
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr key={flow.id} className="border-t border-black hover:bg-gray-50">
                    <td className="p-4 font-medium">{flow.name}</td>
                    <td className="p-4 text-gray-600">{flow.description || '-'}</td>
                    <td className="p-4">{flow.node_count || 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        flow.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : flow.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {flow.status}
                      </span>
                    </td>
                    <td className="p-4">{new Date(flow.created_at).toLocaleDateString('th-TH')}</td>
                    <td className="p-4">
                      <Link href={`/flows/${flow.id}`} className="underline hover:no-underline">
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