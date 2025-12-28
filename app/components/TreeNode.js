'use client'

import { useState } from 'react'

const getTypeBadgeClass = (type) => {
  if (!type) return 'bg-gray-100 text-gray-800'

  const lowerType = type.toLowerCase()

  if (lowerType === 'complex') {
    return 'bg-blue-100 text-blue-800'
  }
  if (['string', 'token', 'name', 'ncname', 'id', 'idref', 'language', 'normalizedstring'].some(t => lowerType.includes(t))) {
    return 'bg-gray-200 text-gray-800'
  }
  if (['int', 'decimal', 'long', 'short', 'byte', 'float', 'double', 'number'].some(t => lowerType.includes(t))) {
    return 'bg-green-100 text-green-800'
  }
  if (lowerType.includes('boolean')) {
    return 'bg-yellow-100 text-yellow-800'
  }
  if (lowerType.includes('date') || lowerType.includes('time')) {
    return 'bg-purple-100 text-purple-800'
  }
  return 'bg-indigo-100 text-indigo-800'
}

export default function TreeNode({ node, level = 0, onSelect, selectedPath }) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels
  
  const hasChildren = node.children && node.children.length > 0
  const indent = level * 24
  const isSelected = selectedPath === node.path
  const isLeaf = !hasChildren

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-2 px-3 cursor-pointer group transition-colors ${
          isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : 'hover:bg-gray-50'
        } ${isLeaf ? 'cursor-pointer' : ''}`}
        style={{ paddingLeft: `${indent + 12}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded)
          }
          if (onSelect) {
            onSelect(node)
          }
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <span className="w-5 text-gray-600 font-bold">
            {isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span className="w-5"></span>
        )}

        {/* Node Icon */}
        <span className="w-6 text-center">
          {hasChildren ? '📁' : '📄'}
        </span>

        {/* Node Name */}
        <span className="flex-1 font-medium ml-2">
          {node.name}
        </span>

        {/* Type Badge */}
        <span className={`px-2 py-1 text-xs rounded ${getTypeBadgeClass(node.type)}`}>
          {node.type}
        </span>

        {/* Array Badge */}
        {node.isArray && (
          <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
            []
          </span>
        )}

        {/* Required Badge */}
        {node.required && (
          <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
            *
          </span>
        )}

        {/* Path (show on hover) */}
        <span className="ml-3 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity max-w-xs truncate">
          {node.path}
        </span>
      </div>

      {/* Restrictions */}
      {node.restrictions && Object.keys(node.restrictions).length > 0 && (
        <div 
          className="flex items-center flex-wrap gap-2 pt-1 pb-2 px-3"
          style={{ paddingLeft: `${indent + 12 + 20 + 24 + 8}px` }} // Align with node name
        >
          {Object.entries(node.restrictions).map(([key, value]) => (
            <span key={key} className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-sm">
              {key}: <strong>{value}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
