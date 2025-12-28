'use client'

import { useState } from 'react'

const getTypeBadgeClass = (type) => {
  if (!type) return 'text-gray-400 border-gray-200'
  const lowerType = type.toLowerCase()

  // ใช้เป็น Text color และ Border แทน Background เข้มๆ เพื่อให้ดู "รางๆ" แต่สวยงาม
  if (lowerType === 'complex') return 'text-blue-500 border-blue-100'
  if (['string', 'token', 'name', 'ncname', 'id', 'idref', 'language', 'normalizedstring'].some(t => lowerType.includes(t))) {
    return 'text-gray-500 border-gray-200'
  }
  if (['int', 'decimal', 'long', 'short', 'byte', 'float', 'double', 'number'].some(t => lowerType.includes(t))) {
    return 'text-emerald-500 border-emerald-100'
  }
  if (lowerType.includes('boolean')) return 'text-amber-500 border-amber-100'
  if (lowerType.includes('date') || lowerType.includes('time')) return 'text-purple-500 border-purple-100'
  
  return 'text-indigo-500 border-indigo-100'
}

export default function TreeNode({ node, level = 0, onSelect, selectedPath }) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  
  const hasChildren = node.children && node.children.length > 0
  const indent = level * 20 // ปรับระดับการเยื้องให้กระชับขึ้น
  const isSelected = selectedPath === node.path

  return (
    <div className="select-none text-sm">
      <div
        className={`flex items-center py-1.5 px-3 cursor-pointer group transition-all ${
          isSelected ? 'bg-blue-50/50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${indent + 12}px` }}
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded)
          if (onSelect) onSelect(node)
        }}
      >
        {/* Expand/Collapse Icon */}
        <span className="w-4 flex-shrink-0 text-[10px] text-gray-400">
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>

        {/* Node Icon */}
        <span className="w-5 flex-shrink-0 text-center opacity-70">
          {hasChildren ? '📁' : '📄'}
        </span>

        {/* Name and Metadata Row */}
        <div className="flex items-baseline gap-2 overflow-hidden">
          <span className={`font-medium whitespace-nowrap ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
            {node.name}
          </span>

          {/* Metadata Container (Type, Required, Array, Restrictions) */}
          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            
            {/* Type Badge (Ghost Style) */}
            <span className={`text-[10px] px-1.5 py-0 border rounded-md font-medium ${getTypeBadgeClass(node.type)}`}>
              {node.type}
            </span>

            {/* Array Badge */}
            {node.isArray && (
              <span className="text-[10px] text-purple-500 font-bold" title="Array">
                []
              </span>
            )}

            {/* Required Star */}
            {node.required && (
              <span className="text-red-400 text-xs" title="Required">*</span>
            )}

            {/* Restrictions Inline */}
            {node.restrictions && Object.keys(node.restrictions).length > 0 && (
              <div className="flex gap-1 items-center border-l border-gray-200 ml-1 pl-2">
                {Object.entries(node.restrictions).map(([key, value]) => (
                  <span key={key} className="text-[10px] text-gray-400 italic">
                    {key}:<span className="text-gray-600 not-italic">{value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full Path (Align to right) */}
        <span className="ml-auto text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pl-4">
          {node.path}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-gray-100 ml-[18px]">
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