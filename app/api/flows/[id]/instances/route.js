import { sql } from '@/lib/db'

export async function POST(request, { params }) {
  try {
    const { id: flowId } = await params
    const { nodeId, positionX, positionY, orderIndex } = await request.json()

    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO flow_instances (flow_id, node_id, position_x, position_y, order_index)
      VALUES (${flowId}, ${nodeId}, ${positionX || 0}, ${positionY || 0}, ${orderIndex || 0})
      RETURNING *
    `

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error adding node to flow:', error)
    return Response.json({ error: 'Failed to add node to flow' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: flowId } = await params
    const { nodeId, positionX, positionY, orderIndex } = await request.json()

    // Check if record exists first
    const existingResult = await sql`
      SELECT * FROM flow_instances
      WHERE flow_id = ${flowId} AND node_id = ${nodeId}
    `

    if (existingResult.rows.length > 0) {
      // Update existing record
      await sql`
        UPDATE flow_instances
        SET
          position_x = ${positionX},
          position_y = ${positionY},
          order_index = ${orderIndex || 0}
        WHERE flow_id = ${flowId} AND node_id = ${nodeId}
      `

      // Return updated record
      const updatedResult = await sql`
        SELECT * FROM flow_instances
        WHERE flow_id = ${flowId} AND node_id = ${nodeId}
      `
      return Response.json(updatedResult.rows[0])
    } else {
      // Create new record
      await sql`
        INSERT INTO flow_instances (flow_id, node_id, position_x, position_y, order_index)
        VALUES (${flowId}, ${nodeId}, ${positionX || 0}, ${positionY || 0}, ${orderIndex || 0})
      `

      // Return created record
      const createdResult = await sql`
        SELECT * FROM flow_instances
        WHERE flow_id = ${flowId} AND node_id = ${nodeId}
      `
      return Response.json(createdResult.rows[0])
    }
  } catch (error) {
    console.error('Error updating/creating flow instance:', error)
    return Response.json({ error: 'Failed to update flow instance' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: flowId } = await params
    const url = new URL(request.url)
    const nodeId = url.searchParams.get('nodeId')

    if (!nodeId) {
      return Response.json({ error: 'Node ID is required' }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM flow_instances
      WHERE flow_id = ${flowId} AND node_id = ${nodeId}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Flow instance not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error removing node from flow:', error)
    return Response.json({ error: 'Failed to remove node from flow' }, { status: 500 })
  }
}