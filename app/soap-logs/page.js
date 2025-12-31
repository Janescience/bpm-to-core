'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SoapLogsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [searchField, setSearchField] = useState(searchParams.get('field') || 'all')
  const [selectedLog, setSelectedLog] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const currentPage = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    fetchLogs()
  }, [searchParams])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (searchField && searchField !== 'all') params.append('field', searchField)
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const res = await fetch(`/api/soap-logs?${params}`)
      const data = await res.json()

      if (res.ok) {
        setLogs(data.logs)
        setPagination(data.pagination)
      } else {
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    updateURL({ search: searchTerm, field: searchField, page: '1' })
  }

  const handlePageChange = (newPage) => {
    updateURL({ page: newPage.toString() })
  }

  const updateURL = (params) => {
    const newSearchParams = new URLSearchParams(searchParams)

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value)
      } else {
        newSearchParams.delete(key)
      }
    })

    router.push(`/soap-logs?${newSearchParams}`)
  }

  const viewLogDetails = async (logId) => {
    try {
      const res = await fetch(`/api/soap-logs/${logId}`)
      const logData = await res.json()

      if (res.ok) {
        setSelectedLog(logData)
        setShowModal(true)
      }
    } catch (error) {
      console.error('Error fetching log details:', error)
    }
  }

  const getStatusColor = (httpStatus) => {
    if (httpStatus >= 200 && httpStatus < 300) return 'bg-green-100 text-green-800'
    if (httpStatus >= 400 && httpStatus < 500) return 'bg-yellow-100 text-yellow-800'
    if (httpStatus >= 500) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SOAP Logs</h1>
          <p className="text-gray-600 mt-2">ประวัติการเรียกใช้ SOAP Services</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค้นหา SOAP logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ค้นหาทั้งหมด</option>
                <option value="json_file_name">JSON File Name</option>
                <option value="service_url">Service URL</option>
                <option value="policy_no">Policy No</option>
                <option value="system_type">System Type</option>
                <option value="http_status">HTTP Status</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ค้นหา
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSearchField('all')
                updateURL({ search: '', field: '', page: '1' })
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ล้าง
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow">
          {/* Stats */}
          {pagination && (
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                แสดง {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} จากทั้งหมด {pagination.total} รายการ
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่/เวลา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policy No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.created_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.json_file_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.service_url || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.policy_no || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.system_type || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.http_status)}`}>
                          {log.http_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => viewLogDetails(log.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  หน้า {pagination.page} จาก {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className={`px-3 py-1 rounded ${
                      pagination.hasPrev
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    ก่อนหน้า
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.page - 2) + i
                    if (pageNum > pagination.totalPages) return null

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded ${
                          pageNum === pagination.page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className={`px-3 py-1 rounded ${
                      pagination.hasNext
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showModal && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
            <div className="bg-white rounded-lg max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">SOAP Log รายละเอียด</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Basic Info - Compact Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      JSON File Name
                    </label>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedLog.json_file_name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      JSON Path
                    </label>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedLog.json_path || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      HTTP Status
                    </label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLog.http_status)}`}>
                      {selectedLog.http_status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      System Type
                    </label>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedLog.system_type || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Service URL
                    </label>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded break-all">
                      {selectedLog.service_url || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Policy No
                    </label>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedLog.policy_no || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Created Date
                    </label>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                      {formatDate(selectedLog.created_date)}
                    </p>
                  </div>
                </div>

                {/* Request & Response Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[60vh]">
                  {/* Request */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">
                        🔵 Request XML
                      </label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedLog.reuest_bpm_soap || '')
                          alert('Request XML copied to clipboard!')
                        }}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 focus:outline-none"
                        title="Copy Request XML"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="flex-1 border border-gray-300 rounded">
                      <pre className="text-xs bg-gray-50 p-3 h-full overflow-auto font-mono whitespace-pre-wrap">
                        {selectedLog.reuest_bpm_soap || 'No request data'}
                      </pre>
                    </div>
                  </div>

                  {/* Response */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">
                        🟢 Response XML
                      </label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedLog.response_bpm_soap || '')
                          alert('Response XML copied to clipboard!')
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 focus:outline-none"
                        title="Copy Response XML"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="flex-1 border border-gray-300 rounded">
                      <pre className="text-xs bg-gray-50 p-3 h-full overflow-auto font-mono whitespace-pre-wrap">
                        {selectedLog.response_bpm_soap || 'No response data'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Request:\n${selectedLog.reuest_bpm_soap || 'No request data'}\n\nResponse:\n${selectedLog.response_bpm_soap || 'No response data'}`
                      )
                      alert('Both Request & Response copied to clipboard!')
                    }}
                    className="px-4 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                  >
                    📋 Copy Both
                  </button>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}