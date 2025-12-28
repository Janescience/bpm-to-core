/**
 * SOAP Execution API Route - Dynamic Mapping Engine
 *
 * This enhanced version uses the dynamic mapping engine
 * with full support for transformation functions including:
 * - CHAIN - Chain multiple transformations together
 * - ARRAY_FILTER - Filter array data by condition
 * - CUSTOM - User-defined functions
 * - CONDITION, CONCAT, DATE, NUMBER, CONFIG, etc.
 */

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'
import axios from 'axios'
import { executeMapping } from '@/lib/mappingEngine'
import { getConfigValue } from '@/lib/configLookup'

export async function POST(request) {
  try {
    const { product_id, json_data, policy_no, mstr_policy_no, message_index } = await request.json()

    // Get product and template info
    const productResult = await sql`
      SELECT p.*, t.soap_endpoint, t.wsdl_url, t.soap_user, t.soap_password, t.xml_structure
      FROM soap_products p
      JOIN soap_templates t ON p.template_id = t.id
      WHERE p.id = ${product_id}
    `

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = productResult.rows[0]

    // Get template mappings
    const templateMappings = await sql`
      SELECT * FROM soap_template_mappings
      WHERE template_id = ${product.template_id}
    `

    // Get product mappings (overrides)
    const productMappings = await sql`
      SELECT * FROM soap_product_mappings
      WHERE product_id = ${product_id}
    `

    // Merge mappings (product overrides template)
    const mappings = mergeMappings(templateMappings.rows, productMappings.rows)

    // Create context for mapping execution (provides config lookup and other helpers)
    const context = {
      configLookup: async (configKey, value) => {
        return await getConfigValue(configKey, value)
      },
      productId: product_id,
      templateId: product.template_id,
      jsonData: json_data || {}
    }

    // Build SOAP XML from mappings and JSON data using dynamic mapping engine
    const soapXml = await buildSoapXMLDynamic(
      mappings,
      json_data || {},
      product.xml_structure,
      product.soap_user,
      product.soap_password,
      message_index || 0,
      context
    )

    // Get SOAP endpoint and remove /WEB-INF/ path
    let soapEndpoint = product.soap_endpoint || product.wsdl_url
    if (soapEndpoint.includes('/WEB-INF/')) {
      soapEndpoint = soapEndpoint.substring(0, soapEndpoint.indexOf('/WEB-INF/'))
    }

    // Execute SOAP request
    let soapResponse
    let httpStatus = 200
    try {
      soapResponse = await executeSoapRequest(
        soapEndpoint,
        soapXml,
        product.soap_user,
        product.soap_password
      )
      httpStatus = soapResponse.status
    } catch (error) {
      httpStatus = error.response?.status || 500
      soapResponse = {
        status: httpStatus,
        data: error.response?.data || error.message
      }
    }

    // Log to history
    await sql`
      INSERT INTO bpm_soap_history
      (created_date, http_status, policy_no, mstr_policy_no,
       reuest_bpm_soap, response_bpm_soap, service_url, system_type)
      VALUES (CURRENT_TIMESTAMP, ${httpStatus}, ${policy_no || null}, ${mstr_policy_no || null},
              ${soapXml}, ${typeof soapResponse.data === 'string' ? soapResponse.data : JSON.stringify(soapResponse.data)},
              ${product.wsdl_url}, 'BPM')
    `

    // Format response XML for pretty display
    let formattedResponse = soapResponse.data
    if (typeof soapResponse.data === 'string' && soapResponse.data.trim().startsWith('<')) {
      formattedResponse = formatXML(soapResponse.data)
    }

    return NextResponse.json({
      success: httpStatus >= 200 && httpStatus < 300,
      request: soapXml,
      response: formattedResponse,
      status: httpStatus
    })

  } catch (error) {
    // Log error
    try {
      await sql`
        INSERT INTO bpm_soap_history
        (created_date, http_status, response_bpm_soap, service_url)
        VALUES (CURRENT_TIMESTAMP, 500, ${error.message}, 'ERROR')
      `
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * Merge template and product mappings (product overrides template)
 */
function mergeMappings(templateMappings, productMappings) {
  const mappingMap = new Map()

  // Add template mappings
  templateMappings.forEach(m => {
    mappingMap.set(m.xml_path, m)
  })

  // Override with product mappings
  productMappings.forEach(m => {
    mappingMap.set(m.xml_path, m)
  })

  return Array.from(mappingMap.values())
}

/**
 * Build SOAP XML using dynamic mapping engine
 */
async function buildSoapXMLDynamic(mappings, jsonData, xmlStructure, soapUser, soapPassword, messageIndex = 0, context) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n'
  xml += '  <soap:Body>\n'

  // Build XML based on structure and mappings
  const structure = typeof xmlStructure === 'string' ? JSON.parse(xmlStructure) : xmlStructure

  if (structure && structure.length > 0) {
    // Use messageIndex to select which request message to execute
    const messageInfo = structure[messageIndex] || structure[0]
    const rootName = messageInfo.messageName

    // Add namespace declarations to root element
    xml += `    <ns3:${rootName} xmlns:ns2="http://www.csc.smart/msp/schemas/MSPContext" xmlns:ns3="http://www.csc.smart/bo/schemas/POLNBCRTI">\n`

    // Build the structure (includes MSPContext and other nodes)
    if (messageInfo.structure.children && messageInfo.structure.children.length > 0) {
      for (const child of messageInfo.structure.children) {
        // Special handling for MSPContext to inject credentials
        if (child.name === 'MSPContext') {
          xml += buildMSPContext(soapUser, soapPassword, 3)
        } else {
          xml += await buildXMLNodeDynamic(child, mappings, jsonData, 3, context)
        }
      }
    }

    xml += `    </ns3:${rootName}>\n`
  }

  xml += '  </soap:Body>\n'
  xml += '</soap:Envelope>'

  return xml
}

/**
 * Build MSPContext authentication section
 */
function buildMSPContext(soapUser, soapPassword, indent) {
  const spaces = '  '.repeat(indent)
  let xml = ''

  xml += `${spaces}<ns2:MSPContext>\n`
  xml += `${spaces}  <ns2:UserId>${soapUser || ''}</ns2:UserId>\n`
  xml += `${spaces}  <ns2:UserPassword>${soapPassword || ''}</ns2:UserPassword>\n`
  xml += `${spaces}  <ns2:RequestParameters/>\n`
  xml += `${spaces}</ns2:MSPContext>\n`

  return xml
}

/**
 * Build XML node using dynamic mapping engine
 */
async function buildXMLNodeDynamic(node, mappings, jsonData, indent, context, messageName = null) {
  const spaces = '  '.repeat(indent)
  let xml = ''

  // Use messageName for root element, otherwise use node.name
  const elementName = messageName || node.name

  if (node.children && node.children.length > 0) {
    // Parent node - open tag on new line with children
    xml += `${spaces}<${elementName}>\n`

    for (const child of node.children) {
      xml += await buildXMLNodeDynamic(child, mappings, jsonData, indent + 1, context)
    }

    xml += `${spaces}</${elementName}>\n`
  } else {
    // Leaf node - inline format <tag>value</tag>
    const mapping = mappings.find(m => m.xml_path === node.path)
    let value = ''

    if (mapping) {
      // Use dynamic mapping engine to transform value
      try {
        // Build mapping configuration for engine
        const mappingConfig = {
          functionType: mapping.function_type || 'DIRECT',
          params: typeof mapping.function_params === 'string'
            ? JSON.parse(mapping.function_params)
            : (mapping.function_params || {}),
          jsonField: mapping.json_field,
          defaultValue: mapping.default_value
        }

        // Execute mapping transformation
        value = await executeMapping(jsonData, mappingConfig, context)

        // Handle array results (for ARRAY function)
        if (Array.isArray(value)) {
          // For array results, we need special handling
          // This will be expanded in a future version
          value = '' // For now, skip array results in inline nodes
        }

        // Convert null/undefined to empty string
        if (value === null || value === undefined) {
          value = ''
        }

        // Escape XML special characters
        value = escapeXML(String(value))
      } catch (error) {
        console.error(`Mapping error for ${node.path}:`, error)
        value = mapping.default_value || ''
      }
    }

    // Inline format for leaf nodes
    xml += `${spaces}<${elementName}>${value}</${elementName}>\n`
  }

  return xml
}

/**
 * Escape XML special characters
 */
function escapeXML(str) {
  if (!str) return ''

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format XML for pretty display
 */
function formatXML(xml) {
  try {
    let formatted = ''
    let indent = 0
    const tab = '  '

    // Remove whitespace between tags but preserve content
    xml = xml.replace(/>\s+</g, '><')

    // Split by tags while capturing them
    const parts = xml.split(/(<[^>]+>)/)

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!part) continue

      if (part.startsWith('<?') || part.startsWith('<!--')) {
        // XML declaration or comment
        formatted += part + '\n'
      } else if (part.startsWith('</')) {
        // Closing tag
        indent = Math.max(0, indent - 1)
        formatted += tab.repeat(indent) + part + '\n'
      } else if (part.startsWith('<')) {
        // Opening or self-closing tag
        const isSelfClosing = part.endsWith('/>')

        // Check if next part is text content followed by closing tag
        const nextPart = parts[i + 1]
        const followingPart = parts[i + 2]
        const hasInlineContent = nextPart && !nextPart.startsWith('<') &&
                                followingPart && followingPart.startsWith('</')

        if (hasInlineContent) {
          // Inline: <tag>content</tag>
          formatted += tab.repeat(indent) + part + nextPart.trim() + followingPart + '\n'
          i += 2 // Skip the content and closing tag
        } else {
          // Block format
          formatted += tab.repeat(indent) + part + '\n'
          if (!isSelfClosing) {
            indent++
          }
        }
      } else {
        // Standalone text content
        const trimmed = part.trim()
        if (trimmed) {
          formatted += tab.repeat(indent) + trimmed + '\n'
        }
      }
    }

    return formatted.trim()
  } catch (error) {
    console.error('XML formatting error:', error)
    return xml
  }
}

/**
 * Execute SOAP request with Basic Authentication
 */
async function executeSoapRequest(wsdlUrl, soapXml, username, password) {
  const headers = {
    'Content-Type': 'text/xml;charset=UTF-8',
    'SOAPAction': ''
  }

  if (username && password) {
    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    headers['Authorization'] = `Basic ${auth}`
  }

  const response = await axios.post(wsdlUrl, soapXml, { headers })
  return response
}
