import { NextResponse } from 'next/server'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

export async function POST(request) {
  try {
    const { wsdl_url } = await request.json()
    
    // Fetch WSDL
    const response = await axios.get(wsdl_url)
    const wsdlContent = response.data
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true
    })
    
    const wsdlJson = parser.parse(wsdlContent)
    
    // Get base URL for loading XSD files
    const baseUrl = wsdl_url.substring(0, wsdl_url.lastIndexOf('/'))
    
    // Extract SOAP endpoint URL (with fallback to WSDL URL)
    const soapEndpoint = extractSoapEndpoint(wsdlJson, wsdl_url)
    
    // Extract XML structure for request
    const xmlStructure = await extractXMLStructure(wsdlJson, baseUrl, parser)
    
    return NextResponse.json({ 
      success: true,
      soap_endpoint: soapEndpoint,
      structure: xmlStructure 
    })
  } catch (error) {
    console.error('WSDL Parse Error:', error)
    return NextResponse.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}

async function extractXMLStructure(wsdlJson, baseUrl, parser) {
  const structure = []
  
  try {
    const definitions = wsdlJson.definitions || wsdlJson
    
    // Find request messages
    const messages = definitions.message || []
    const messageArray = Array.isArray(messages) ? messages : [messages]
    
    // Filter request messages (usually end with "Request")
    const requestMessages = messageArray.filter(msg => 
      msg['@_name'] && msg['@_name'].includes('Request')
    )
    
    // Load imported XSD schemas
    const schemas = await loadImportedSchemas(definitions, baseUrl, parser)
    
    // Process each request message
    for (const message of requestMessages) {
      const part = Array.isArray(message.part) ? message.part[0] : message.part
      
      if (part && part['@_element']) {
        // Extract namespace and element name
        const elementRef = part['@_element']
        const elementName = elementRef.split(':').pop()
        
        // Find element definition in schemas
        const element = findElementInSchemas(elementName, schemas)
        
        if (element) {
          const node = await buildTreeNode(element, elementName, '', schemas)
          
          // Add MSPContext to the structure
          const structureWithContext = {
            name: elementName,
            path: elementName,
            type: 'complex',
            required: true,
            children: [
              // MSPContext node
              {
                name: 'MSPContext',
                path: `${elementName}.MSPContext`,
                type: 'complex',
                required: true,
                namespace: 'ns2',
                children: [
                  {
                    name: 'UserId',
                    path: `${elementName}.MSPContext.UserId`,
                    type: 'string',
                    required: true,
                    namespace: 'ns2',
                    children: []
                  },
                  {
                    name: 'UserPassword',
                    path: `${elementName}.MSPContext.UserPassword`,
                    type: 'string',
                    required: true,
                    namespace: 'ns2',
                    children: []
                  },
                  {
                    name: 'RequestParameters',
                    path: `${elementName}.MSPContext.RequestParameters`,
                    type: 'string',
                    required: false,
                    namespace: 'ns2',
                    children: []
                  }
                ]
              },
              // Original structure children
              ...node.children
            ]
          }
          
          structure.push({
            messageName: message['@_name'],
            soapAction: findSoapAction(definitions, message['@_name']),
            structure: structureWithContext
          })
        }
      }
    }
  } catch (error) {
    console.error('Error extracting structure:', error)
  }
  
  return structure
}

async function loadImportedSchemas(definitions, baseUrl, parser) {
  const allSchemas = []
  
  try {
    const types = definitions.types
    const mainSchema = types?.schema || types?.['xsd:schema']
    
    if (!mainSchema) return allSchemas
    
    const schemaArray = Array.isArray(mainSchema) ? mainSchema : [mainSchema]
    
    for (const schema of schemaArray) {
      allSchemas.push(schema)
      
      // Load imported schemas
      const imports = schema.import || schema['xsd:import'] || []
      const importArray = Array.isArray(imports) ? imports : [imports]
      
      for (const imp of importArray) {
        const schemaLocation = imp['@_schemaLocation']
        if (schemaLocation) {
          try {
            const schemaUrl = `${baseUrl}/${schemaLocation}`
            const response = await axios.get(schemaUrl)
            const schemaJson = parser.parse(response.data)
            const importedSchema = schemaJson.schema || schemaJson['xsd:schema']
            if (importedSchema) {
              allSchemas.push(importedSchema)
            }
          } catch (error) {
            console.error(`Error loading schema ${schemaLocation}:`, error.message)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading schemas:', error)
  }
  
  return allSchemas
}

function findElementInSchemas(elementName, schemas) {
  for (const schema of schemas) {
    const elements = schema.element || schema['xsd:element'] || []
    const elementArray = Array.isArray(elements) ? elements : [elements]
    
    for (const element of elementArray) {
      if (element['@_name'] === elementName) {
        return element
      }
    }
  }
  return null
}

function findSoapAction(definitions, messageName) {
  try {
    const bindings = definitions.binding || []
    const bindingArray = Array.isArray(bindings) ? bindings : [bindings]
    
    for (const binding of bindingArray) {
      const operations = binding.operation || []
      const operationArray = Array.isArray(operations) ? operations : [operations]
      
      for (const operation of operationArray) {
        const soapOp = operation['soap:operation'] || operation.operation
        if (soapOp && soapOp['@_soapAction']) {
          return soapOp['@_soapAction']
        }
      }
    }
  } catch (error) {
    console.error('Error finding soap action:', error)
  }
  return ''
}

function extractSoapEndpoint(wsdlJson, wsdlUrl) {
  try {
    // First, try to extract from WSDL service definition
    const definitions = wsdlJson.definitions || wsdlJson
    const services = definitions.service || []
    const serviceArray = Array.isArray(services) ? services : [services]
    
    for (const service of serviceArray) {
      const ports = service.port || []
      const portArray = Array.isArray(ports) ? ports : [ports]
      
      for (const port of portArray) {
        const soapAddress = port['soap:address'] || port.address
        if (soapAddress && soapAddress['@_location']) {
          return soapAddress['@_location']
        }
      }
    }
  } catch (error) {
    console.error('Error extracting SOAP endpoint from WSDL:', error)
  }
  
  // Fallback: derive from WSDL URL by removing /WEB-INF/... part
  try {
    if (wsdlUrl) {
      // Find the position of /WEB-INF/ and cut everything from there
      const webInfIndex = wsdlUrl.indexOf('/WEB-INF/')
      if (webInfIndex !== -1) {
        return wsdlUrl.substring(0, webInfIndex)
      }
      
      // If no /WEB-INF/, try to remove the last part (filename)
      const lastSlashIndex = wsdlUrl.lastIndexOf('/')
      if (lastSlashIndex !== -1) {
        return wsdlUrl.substring(0, lastSlashIndex)
      }
    }
  } catch (error) {
    console.error('Error deriving SOAP endpoint from URL:', error)
  }
  
  return wsdlUrl || null
}

async function buildTreeNode(element, name, path, schemas) {
  const currentPath = path ? `${path}.${name}` : name
  
  // Extract clean type (remove namespace prefix)
  let rawType = element['@_type'] || ''
  let cleanType = rawType ? rawType.split(':').pop() : 'string'
  
  const node = {
    name: name,
    path: currentPath,
    type: cleanType,
    required: element['@_minOccurs'] !== '0',
    isArray: element['@_maxOccurs'] === 'unbounded' || (element['@_maxOccurs'] && parseInt(element['@_maxOccurs']) > 1),
    restrictions: {},
    children: []
  }

  // Handle simpleType for restrictions
  const simpleType = element.simpleType || element['xsd:simpleType']
  if (simpleType) {
    const restriction = simpleType.restriction || simpleType['xsd:restriction']
    if (restriction) {
      // Extract base type from restriction
      const baseType = restriction['@_base'] || ''
      if (baseType) {
        cleanType = baseType.split(':').pop()
        node.type = cleanType
      }
      // Extract all restriction facets
      node.restrictions = extractRestrictions(restriction)
    }
  }

  const isPrimitive = [
    // Primitives
    'string', 'boolean', 'decimal', 'float', 'double', 'duration', 'dateTime', 'time', 'date', 
    'gYearMonth', 'gYear', 'gMonthDay', 'gDay', 'gMonth', 'hexBinary', 'base64Binary', 'anyURI', 'QName', 'NOTATION',
    // Derived
    'normalizedString', 'token', 'language', 'NMTOKEN', 'NMTOKENS', 'Name', 'NCName', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES',
    'integer', 'nonPositiveInteger', 'negativeInteger', 'long', 'int', 'short', 'byte', 
    'nonNegativeInteger', 'unsignedLong', 'unsignedInt', 'unsignedShort', 'unsignedByte', 'positiveInteger'
  ].includes(cleanType)
  node.type = isPrimitive ? cleanType : 'complex'
  
  // Handle sequence elements
  const sequence = element.sequence || element['xsd:sequence']
  if (sequence) {
    const sequenceElements = sequence.element || sequence['xsd:element'] || []
    const elementArray = Array.isArray(sequenceElements) ? sequenceElements : [sequenceElements]
    
    for (const child of elementArray) {
      if (child['@_name']) {
        const childNode = await buildTreeNode(child, child['@_name'], currentPath, schemas)
        node.children.push(childNode)
      }
    }
  }
  
  // Handle complexType inline
  const complexType = element.complexType || element['xsd:complexType']
  if (complexType) {
    const complexSequence = complexType.sequence || complexType['xsd:sequence']
    if (complexSequence) {
      const complexElements = complexSequence.element || complexSequence['xsd:element'] || []
      const complexArray = Array.isArray(complexElements) ? complexElements : [complexElements]
      
      for (const child of complexArray) {
        if (child['@_name']) {
          const childNode = await buildTreeNode(child, child['@_name'], currentPath, schemas)
          node.children.push(childNode)
        }
      }
    }
  }
  
  // Handle type reference (custom complex types)
  if (!isPrimitive && rawType && schemas) {
    const typeName = rawType.split(':').pop()
    const complexTypeDef = findComplexTypeInSchemas(typeName, schemas)
    
    if (complexTypeDef) {
      const typeSequence = complexTypeDef.sequence || complexTypeDef['xsd:sequence']
      if (typeSequence) {
        const typeElements = typeSequence.element || typeSequence['xsd:element'] || []
        const typeArray = Array.isArray(typeElements) ? typeElements : [typeElements]
        
        for (const child of typeArray) {
          if (child['@_name']) {
            const childNode = await buildTreeNode(child, child['@_name'], currentPath, schemas)
            node.children.push(childNode)
          }
        }
      }
    }
  }
  
  return node
}

function extractRestrictions(restriction) {
    const restrictions = {}
    if (!restriction) return restrictions

    for (const key in restriction) {
        if (key.startsWith('@_')) continue // ignore attributes of restriction tag itself like '@_base'

        const cleanKey = key.replace('xsd:', '')
        const value = restriction[key]['@_value']

        if (value !== undefined) {
            restrictions[cleanKey] = value
        }
    }
    return restrictions
}


function findComplexTypeInSchemas(typeName, schemas) {
  for (const schema of schemas) {
    const complexTypes = schema.complexType || schema['xsd:complexType'] || []
    const typeArray = Array.isArray(complexTypes) ? complexTypes : [complexTypes]
    
    for (const type of typeArray) {
      if (type['@_name'] === typeName) {
        return type
      }
    }
  }
  return null
}
