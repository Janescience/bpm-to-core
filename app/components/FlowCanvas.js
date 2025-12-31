'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import NodeConfigModal from './NodeConfigModal'

const NODE_TYPES = {
  product: { color: 'bg-blue-100 border-blue-300', icon: '📦' },
  template: { color: 'bg-purple-100 border-purple-300', icon: '📋' },
  custom: { color: 'bg-green-100 border-green-300', icon: '⚙️' }
}

export default function FlowCanvas({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  flowId,
  executionResult
}) {
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragOver, setDragOver] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configNode, setConfigNode] = useState(null)
  const [selectedConnection, setSelectedConnection] = useState(null)

  const handleMouseDown = (e, node) => {
    if (e.button !== 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - canvasOffset.x) / scale
    const y = (e.clientY - rect.top - canvasOffset.y) / scale

    setDraggedNode(node)
    setDragOffset({
      x: x - node.position_x,
      y: y - node.position_y
    })
    setIsDragging(true)
    setSelectedNode(node)
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggedNode || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - canvasOffset.x) / scale - dragOffset.x
    const y = (e.clientY - rect.top - canvasOffset.y) / scale - dragOffset.y

    const updatedNodes = nodes.map(node =>
      node.id === draggedNode.id
        ? { ...node, position_x: x, position_y: y }
        : node
    )

    onNodesChange(updatedNodes)

    updateNodePosition(draggedNode.id, x, y)
  }, [isDragging, draggedNode, dragOffset, nodes, onNodesChange, canvasOffset, scale])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedNode(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null)
      setSelectedConnection(null)
    }
  }

  const handleNodeConnect = (sourceNode) => {
    if (connecting && connecting.id !== sourceNode.id) {
      createConnection(connecting.id, sourceNode.id)
      setConnecting(null)
    } else {
      setConnecting(sourceNode)
    }
  }

  const updateNodePosition = async (nodeId, x, y) => {
    try {
      await fetch(`/api/flows/${flowId}/instances`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId,
          positionX: x,
          positionY: y,
          orderIndex: 0
        }),
      })
    } catch (error) {
      console.error('Error updating node position:', error)
    }
  }

  const createConnection = async (sourceId, targetId) => {
    try {
      const res = await fetch(`/api/flows/${flowId}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceNodeId: sourceId,
          targetNodeId: targetId
        }),
      })

      if (res.ok) {
        const newConnection = await res.json()
        onConnectionsChange([...connections, newConnection])
      }
    } catch (error) {
      console.error('Error creating connection:', error)
    }
  }

  const deleteNode = async (nodeId) => {
    try {
      await fetch(`/api/flows/${flowId}/instances?nodeId=${nodeId}`, {
        method: 'DELETE'
      })

      const updatedNodes = nodes.filter(node => node.id !== nodeId)
      const updatedConnections = connections.filter(
        conn => conn.source_node_id !== nodeId && conn.target_node_id !== nodeId
      )

      onNodesChange(updatedNodes)
      onConnectionsChange(updatedConnections)
      setSelectedNode(null)
    } catch (error) {
      console.error('Error deleting node:', error)
    }
  }

  const deleteConnection = async (connectionId) => {
    try {
      await fetch(`/api/flows/${flowId}/connections?connectionId=${connectionId}`, {
        method: 'DELETE'
      })

      const updatedConnections = connections.filter(conn => conn.id !== connectionId)
      onConnectionsChange(updatedConnections)
      setSelectedConnection(null)
    } catch (error) {
      console.error('Error deleting connection:', error)
    }
  }

  const handleConnectionClick = (e, connection) => {
    e.stopPropagation()
    setSelectedConnection(connection)
    setSelectedNode(null)
  }

  const getNodeStatus = (nodeId) => {
    if (!executionResult?.nodeStatuses) return null
    return executionResult.nodeStatuses[nodeId]?.status || null
  }

  const getConnectionPath = (sourceNode, targetNode) => {
    const startX = sourceNode.position_x + 100
    const startY = sourceNode.position_y + 30
    const endX = targetNode.position_x
    const endY = targetNode.position_y + 30

    const midX = (startX + endX) / 2

    return `M ${startX} ${startY} Q ${midX} ${startY} ${midX} ${(startY + endY) / 2} Q ${midX} ${endY} ${endX} ${endY}`
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)

    try {
      const nodeData = JSON.parse(e.dataTransfer.getData('application/json'))
      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - canvasOffset.x) / scale
      const y = (e.clientY - rect.top - canvasOffset.y) / scale

      const res = await fetch(`/api/flows/${flowId}/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: nodeData.id,
          positionX: x,
          positionY: y,
          orderIndex: nodes.length
        }),
      })

      if (res.ok) {
        const newNode = { ...nodeData, position_x: x, position_y: y }
        onNodesChange([...nodes, newNode])
      }
    } catch (error) {
      console.error('Error adding node to flow:', error)
    }
  }

  const handleConfigNode = (node) => {
    setConfigNode(node)
    setShowConfigModal(true)
  }

  const handleSaveNodeConfig = async (updatedConfig) => {
    try {
      const res = await fetch(`/api/nodes/${configNode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig),
      })

      if (res.ok) {
        const updatedNode = await res.json()
        const updatedNodes = nodes.map(node =>
          node.id === configNode.id ? { ...node, ...updatedNode } : node
        )
        onNodesChange(updatedNodes)
        setShowConfigModal(false)
        setConfigNode(null)
      }
    } catch (error) {
      console.error('Error updating node configuration:', error)
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50">
      <div
        ref={canvasRef}
        className={`absolute inset-0 cursor-grab ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`
        }}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Grid Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full">
          {connections.map((connection) => {
            const sourceNode = nodes.find(n => n.id === connection.source_node_id)
            const targetNode = nodes.find(n => n.id === connection.target_node_id)

            if (!sourceNode || !targetNode) return null

            const isSelected = selectedConnection?.id === connection.id

            return (
              <g key={`connection-${connection.id}`}>
                {/* Invisible larger path for easier clicking */}
                <path
                  d={getConnectionPath(sourceNode, targetNode)}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  className="cursor-pointer"
                  onClick={(e) => handleConnectionClick(e, connection)}
                />
                {/* Visible connection line */}
                <path
                  d={getConnectionPath(sourceNode, targetNode)}
                  stroke={isSelected ? "#ef4444" : "#6b7280"}
                  strokeWidth={isSelected ? "3" : "2"}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="cursor-pointer pointer-events-none"
                />
              </g>
            )
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6b7280"
              />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const nodeType = NODE_TYPES[node.type] || NODE_TYPES.custom
          const status = getNodeStatus(node.id)
          const isSelected = selectedNode?.id === node.id
          const isConnecting = connecting?.id === node.id

          return (
            <div
              key={node.id}
              className={`absolute border-2 rounded-lg p-3 cursor-move shadow-md min-w-[200px] ${nodeType.color} ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              } ${isConnecting ? 'ring-2 ring-orange-500' : ''}`}
              style={{
                left: node.position_x,
                top: node.position_y,
                transform: isDragging && draggedNode?.id === node.id ? 'scale(1.05)' : 'scale(1)'
              }}
              onMouseDown={(e) => handleMouseDown(e, node)}
            >
              {/* Node Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{nodeType.icon}</span>
                  <span className="font-medium text-sm">{node.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {status && (
                    <span className="text-lg" title={`Status: ${status}`}>
                      {status === 'completed' ? '✅' : status === 'failed' ? '❌' : status === 'running' ? '⏳' : '⏸️'}
                    </span>
                  )}
                  {executionResult?.nodeStatuses?.[node.id]?.error && (
                    <span className="text-red-500 text-xs" title={executionResult.nodeStatuses[node.id].error}>
                      ⚠️
                    </span>
                  )}
                </div>
              </div>

              {/* Node Type */}
              <div className="text-xs text-gray-600 mb-2">
                {node.type.toUpperCase()}
              </div>

              {/* Connection Points and Actions */}
              <div className="flex justify-between items-center">
                <div
                  className="w-3 h-3 bg-gray-400 rounded-full cursor-pointer hover:bg-gray-600"
                  title="Input"
                />
                <div className="flex gap-1">
                  <button
                    className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConfigNode(node)
                    }}
                    title="กำหนดค่า Node"
                  >
                    ⚙️
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNodeConnect(node)
                    }}
                  >
                    {connecting?.id === node.id ? 'เลือกเป้าหมาย' : 'เชื่อม'}
                  </button>
                </div>
                <div
                  className="w-3 h-3 bg-gray-400 rounded-full cursor-pointer hover:bg-gray-600"
                  title="Output"
                />
              </div>

              {/* Delete Button */}
              {isSelected && (
                <button
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(node.id)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          className="p-2 bg-white rounded shadow hover:bg-gray-50"
          onClick={() => setScale(Math.min(scale * 1.2, 2))}
        >
          🔍+
        </button>
        <button
          className="p-2 bg-white rounded shadow hover:bg-gray-50"
          onClick={() => setScale(Math.max(scale / 1.2, 0.5))}
        >
          🔍-
        </button>
        <button
          className="p-2 bg-white rounded shadow hover:bg-gray-50"
          onClick={() => {
            setScale(1)
            setCanvasOffset({ x: 0, y: 0 })
          }}
        >
          🎯
        </button>
      </div>

      {/* Info Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded shadow-lg max-w-sm">
          <h3 className="font-bold mb-2">{selectedNode.name}</h3>
          <p className="text-sm text-gray-600 mb-2">Type: {selectedNode.type}</p>
          {selectedNode.api_path && (
            <p className="text-sm text-gray-600 mb-2">API: {selectedNode.api_path}</p>
          )}
          {selectedNode.database_table && (
            <p className="text-sm text-gray-600 mb-2">Table: {selectedNode.database_table}</p>
          )}
          {selectedNode.external_api_url && (
            <p className="text-sm text-gray-600 mb-2">External: {selectedNode.external_api_url}</p>
          )}
        </div>
      )}

      {/* Connection Info Panel */}
      {selectedConnection && (
        <div className="absolute bottom-4 right-4 bg-white p-4 rounded shadow-lg max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">การเชื่อมต่อ</h3>
            <button
              onClick={() => deleteConnection(selectedConnection.id)}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              title="ลบการเชื่อมต่อ"
            >
              🗑️ ลบ
            </button>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>จาก:</strong> {nodes.find(n => n.id === selectedConnection.source_node_id)?.name || 'Unknown'}
            </p>
            <p>
              <strong>ไป:</strong> {nodes.find(n => n.id === selectedConnection.target_node_id)?.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              คลิกที่เส้นเพื่อเลือก หรือคลิกพื้นที่ว่างเพื่อยกเลิก
            </p>
          </div>
        </div>
      )}

      {/* Node Configuration Modal */}
      <NodeConfigModal
        node={configNode}
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false)
          setConfigNode(null)
        }}
        onSave={handleSaveNodeConfig}
      />
    </div>
  )
}