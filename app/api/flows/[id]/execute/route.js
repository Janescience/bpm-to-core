import { sql } from '@/lib/db'
import axios from 'axios'

export async function POST(request, { params }) {
  try {
    const { id } = await params

    const executionResult = await sql`
      INSERT INTO flow_executions (flow_id, status)
      VALUES (${id}, 'running')
      RETURNING *
    `

    const execution = executionResult.rows[0]

    const nodesResult = await sql`
      SELECT
        n.*,
        fi.position_x,
        fi.position_y,
        fi.order_index
      FROM nodes n
      JOIN flow_instances fi ON n.id = fi.node_id
      WHERE fi.flow_id = ${id}
      ORDER BY fi.order_index
    `

    const nodes = nodesResult.rows
    let allSuccess = true
    let executionData = {}
    let nodeStatuses = {}

    for (const node of nodes) {
      try {
        // Initialize node status
        nodeStatuses[node.id] = {
          nodeId: node.id,
          nodeName: node.name,
          status: 'running',
          startedAt: new Date().toISOString(),
          inputData: null,
          outputData: null,
          error: null
        }
        await sql`
          INSERT INTO node_executions (flow_execution_id, node_id, status)
          VALUES (${execution.id}, ${node.id}, 'running')
        `

        let nodeResult = null
        let inputData = {}

        if (node.type === 'product') {
          const productResult = await sql`SELECT * FROM soap_products WHERE id = ${node.config?.productId}`
          nodeResult = productResult.rows[0]
          inputData = { productData: nodeResult }
        } else if (node.type === 'template') {
          const templateResult = await sql`SELECT * FROM soap_templates WHERE id = ${node.config?.templateId}`
          nodeResult = templateResult.rows[0]
          inputData = { templateData: nodeResult }
        } else if (node.type === 'custom') {
          inputData = executionData

          if (node.external_api_url) {
            const mappedPayload = applyMapping(executionData, node.input_mapping)
            const apiResponse = await axios.post(node.external_api_url, mappedPayload)
            nodeResult = apiResponse.data
          }

          if (node.database_table) {
            const mappedData = applyMapping(executionData, node.input_mapping)
            // For demo purposes, just simulate database insert
            nodeResult = {
              table: node.database_table,
              inserted_data: mappedData,
              inserted_at: new Date().toISOString(),
              status: 'success'
            }
            console.log(`Simulated insert to ${node.database_table}:`, mappedData)
          }
        }

        executionData[node.name] = nodeResult

        // Update node status
        nodeStatuses[node.id] = {
          ...nodeStatuses[node.id],
          status: 'completed',
          inputData: inputData,
          outputData: nodeResult,
          completedAt: new Date().toISOString()
        }

        await sql`
          UPDATE node_executions
          SET
            status = 'completed',
            input_data = ${JSON.stringify(inputData)},
            output_data = ${JSON.stringify(nodeResult)},
            completed_at = CURRENT_TIMESTAMP
          WHERE flow_execution_id = ${execution.id} AND node_id = ${node.id}
        `

      } catch (error) {
        console.error(`Error executing node ${node.name}:`, error)
        allSuccess = false

        // Update node status with error
        nodeStatuses[node.id] = {
          ...nodeStatuses[node.id],
          status: 'failed',
          error: error.message,
          completedAt: new Date().toISOString()
        }

        await sql`
          UPDATE node_executions
          SET
            status = 'failed',
            error_message = ${error.message},
            completed_at = CURRENT_TIMESTAMP
          WHERE flow_execution_id = ${execution.id} AND node_id = ${node.id}
        `
      }
    }

    await sql`
      UPDATE flow_executions
      SET
        status = ${allSuccess ? 'completed' : 'failed'},
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ${execution.id}
    `

    return Response.json({
      execution_id: execution.id,
      status: allSuccess ? 'completed' : 'failed',
      data: executionData,
      nodeStatuses: nodeStatuses,
      summary: {
        totalNodes: nodes.length,
        completedNodes: Object.values(nodeStatuses).filter(n => n.status === 'completed').length,
        failedNodes: Object.values(nodeStatuses).filter(n => n.status === 'failed').length,
        executionTime: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error executing flow:', error)
    return Response.json({ error: 'Failed to execute flow' }, { status: 500 })
  }
}

function applyMapping(sourceData, mapping) {
  const result = {}

  for (const [targetKey, sourcePath] of Object.entries(mapping)) {
    const value = getNestedValue(sourceData, sourcePath)
    if (value !== undefined) {
      result[targetKey] = value
    }
  }

  return result
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}