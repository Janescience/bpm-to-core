'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import FlowCanvas from '@/app/components/FlowCanvas'
import NodePalette from '@/app/components/NodePalette'

export default function FlowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [flow, setFlow] = useState(null)
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [availableNodes, setAvailableNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState(null)

  useEffect(() => {
    if (params.id) {
      fetchFlowDetails()
      fetchAvailableNodes()
    }
  }, [params.id])

  const fetchFlowDetails = async () => {
    try {
      const res = await fetch(`/api/flows/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setFlow(data.flow)
        setNodes(data.nodes || [])
        setConnections(data.connections || [])
      } else {
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching flow details:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableNodes = async () => {
    try {
      const [nodesRes, productsRes, templatesRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/products'),
        fetch('/api/templates')
      ])

      const [customNodes, products, templates] = await Promise.all([
        nodesRes.json(),
        productsRes.json(),
        templatesRes.json()
      ])

      // For now, only use custom nodes to avoid foreign key issues
      // Products and templates can be referenced through custom nodes' config
      const allNodes = [
        ...customNodes
      ]

      setAvailableNodes(allNodes)
    } catch (error) {
      console.error('Error fetching available nodes:', error)
    }
  }

  const executeFlow = async () => {
    if (!flow) return

    setExecuting(true)
    setExecutionResult(null)

    try {
      const res = await fetch(`/api/flows/${flow.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await res.json()
      setExecutionResult(result)
    } catch (error) {
      console.error('Error executing flow:', error)
      setExecutionResult({ error: 'Failed to execute flow' })
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  if (!flow) {
    return <div className="min-h-screen flex items-center justify-center">ไม่พบ Flow</div>
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/flows')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← กลับ
            </button>
            <div>
              <h1 className="text-2xl font-bold">{flow.name}</h1>
              <p className="text-gray-600">{flow.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={executeFlow}
              disabled={executing || nodes.length === 0}
              className={`px-4 py-2 rounded ${
                executing || nodes.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {executing ? 'กำลังรัน...' : 'รัน Flow'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <NodePalette
            availableNodes={availableNodes}
            onNodeAdd={(nodeId, position) => {
              // Add node to flow implementation
              console.log('Add node:', nodeId, position)
            }}
          />
        </div>

        {/* Flow Canvas */}
        <div className="flex-1 relative">
          <FlowCanvas
            nodes={nodes}
            connections={connections}
            onNodesChange={setNodes}
            onConnectionsChange={setConnections}
            flowId={params.id}
            executionResult={executionResult}
          />
        </div>
      </div>

      {/* Execution Result Panel */}
      {executionResult && (
        <div className="bg-white border-t border-gray-200 p-4 max-h-80 overflow-y-auto">
          {/* Execution Summary */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">
              ผลการรัน Flow:
              <span className={`ml-2 px-3 py-1 text-sm rounded-full ${
                executionResult.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {executionResult.status === 'completed' ? 'สำเร็จ' : 'ล้มเหลว'}
              </span>
            </h3>
            {executionResult.summary && (
              <div className="text-sm text-gray-600">
                {executionResult.summary.completedNodes}/{executionResult.summary.totalNodes} Nodes
                {executionResult.summary.failedNodes > 0 && (
                  <span className="text-red-600 ml-2">
                    ({executionResult.summary.failedNodes} ล้มเหลว)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Node Status Overview */}
          {executionResult.nodeStatuses && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">สถานะ Nodes:</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.values(executionResult.nodeStatuses).map((nodeStatus) => (
                  <div
                    key={nodeStatus.nodeId}
                    className={`flex items-center justify-between p-2 rounded border ${
                      nodeStatus.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : nodeStatus.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {nodeStatus.status === 'completed' ? '✅' :
                         nodeStatus.status === 'failed' ? '❌' : '⏳'}
                      </span>
                      <span className="font-medium">{nodeStatus.nodeName}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {nodeStatus.status === 'completed' && nodeStatus.completedAt && (
                        <span>เสร็จ: {new Date(nodeStatus.completedAt).toLocaleTimeString('th-TH')}</span>
                      )}
                      {nodeStatus.status === 'failed' && nodeStatus.error && (
                        <span className="text-red-600" title={nodeStatus.error}>
                          Error: {nodeStatus.error.substring(0, 50)}...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results - Collapsible */}
          <details className="mt-4">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              รายละเอียดผลลัพธ์ (คลิกเพื่อดู)
            </summary>
            <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto max-h-40">
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}