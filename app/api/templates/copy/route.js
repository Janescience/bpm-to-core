import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

export async function POST(request) {
  try {
    const { source_template_id, new_template_name, new_wsdl_url } = await request.json()
    
    // Get source template
    const sourceResult = await sql`
      SELECT * FROM soap_templates WHERE id = ${source_template_id}
    `
    
    if (sourceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Source template not found' }, { status: 404 })
    }
    
    const sourceTemplate = sourceResult.rows[0]
    
    // Parse new WSDL to get structure
    const parseRes = await fetch(`${request.nextUrl.origin}/api/wsdl/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wsdl_url: new_wsdl_url })
    })
    
    const parseData = await parseRes.json()
    
    if (!parseData.success) {
      return NextResponse.json({ 
        error: 'Failed to parse new WSDL',
        details: parseData.error 
      }, { status: 400 })
    }
    
    // Create new template
    const newTemplateResult = await sql`
      INSERT INTO soap_templates (template_name, wsdl_url, soap_endpoint, soap_user, soap_password, xml_structure)
      VALUES (
        ${new_template_name},
        ${new_wsdl_url},
        ${parseData.soap_endpoint || new_wsdl_url},
        ${sourceTemplate.soap_user},
        ${sourceTemplate.soap_password},
        ${JSON.stringify(parseData.structure)}
      )
      RETURNING *
    `
    
    const newTemplate = newTemplateResult.rows[0]
    
    // Get source mappings
    const sourceMappingsResult = await sql`
      SELECT * FROM soap_template_mappings WHERE template_id = ${source_template_id}
    `
    
    // Extract all paths from new structure
    const newStructurePaths = new Set()
    const extractPaths = (node) => {
      if (!node) return
      
      if (Array.isArray(node)) {
        node.forEach(n => extractPaths(n.structure || n))
        return
      }
      
      if (node.path) {
        newStructurePaths.add(node.path)
      }
      
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => extractPaths(child))
      }
    }
    
    extractPaths(parseData.structure)
    
    // Copy mappings that match new structure paths
    let copiedCount = 0
    for (const mapping of sourceMappingsResult.rows) {
      if (newStructurePaths.has(mapping.xml_path)) {
        await sql`
          INSERT INTO soap_template_mappings (
            template_id, xml_path, json_field, parent_node, is_required, default_value
          )
          VALUES (
            ${newTemplate.id},
            ${mapping.xml_path},
            ${mapping.json_field},
            ${mapping.parent_node},
            ${mapping.is_required},
            ${mapping.default_value}
          )
        `
        copiedCount++
      }
    }
    
    return NextResponse.json({
      success: true,
      new_template: newTemplate,
      copied_mappings: copiedCount,
      total_source_mappings: sourceMappingsResult.rows.length,
      total_new_fields: newStructurePaths.size
    })
    
  } catch (error) {
    console.error('Copy template error:', error)
    return NextResponse.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}
