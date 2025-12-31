import { sql } from '@/lib/db'

export async function POST(request, { params }) {
  try {
    const { id: flowId } = await params
    const { sourceNodeId, targetNodeId } = await request.json()

    if (!sourceNodeId || !targetNodeId) {
      return Response.json({ error: 'Source and target node IDs are required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO flow_connections (flow_id, source_node_id, target_node_id)
      VALUES (${flowId}, ${sourceNodeId}, ${targetNodeId})
      RETURNING *
    `

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error creating connection:', error)
    return Response.json({ error: 'Failed to create connection' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: flowId } = await params
    const url = new URL(request.url)
    const connectionId = url.searchParams.get('connectionId')
    const sourceNodeId = url.searchParams.get('sourceNodeId')
    const targetNodeId = url.searchParams.get('targetNodeId')

    let result

    if (connectionId) {
      // Delete by connection ID
      result = await sql`
        DELETE FROM flow_connections
        WHERE flow_id = ${flowId} AND id = ${connectionId}
        RETURNING id
      `
    } else if (sourceNodeId && targetNodeId) {
      // Delete by source and target node IDs (legacy support)
      result = await sql`
        DELETE FROM flow_connections
        WHERE flow_id = ${flowId}
          AND source_node_id = ${sourceNodeId}
          AND target_node_id = ${targetNodeId}
        RETURNING id
      `
    } else {
      return Response.json({ error: 'Connection ID or source and target node IDs are required' }, { status: 400 })
    }

    if (result.rows.length === 0) {
      return Response.json({ error: 'Connection not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return Response.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}