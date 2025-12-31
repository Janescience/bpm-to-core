import { sql } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const flowResult = await sql`
      SELECT * FROM flows WHERE id = ${id}
    `

    if (flowResult.rows.length === 0) {
      return Response.json({ error: 'Flow not found' }, { status: 404 })
    }

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

    const connectionsResult = await sql`
      SELECT
        fc.*,
        sn.name as source_node_name,
        tn.name as target_node_name
      FROM flow_connections fc
      JOIN nodes sn ON fc.source_node_id = sn.id
      JOIN nodes tn ON fc.target_node_id = tn.id
      WHERE fc.flow_id = ${id}
    `

    return Response.json({
      flow: flowResult.rows[0],
      nodes: nodesResult.rows,
      connections: connectionsResult.rows
    })
  } catch (error) {
    console.error('Error fetching flow:', error)
    return Response.json({ error: 'Failed to fetch flow' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const { name, description, status } = await request.json()

    const result = await sql`
      UPDATE flows
      SET
        name = ${name},
        description = ${description},
        status = ${status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Flow not found' }, { status: 404 })
    }

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating flow:', error)
    return Response.json({ error: 'Failed to update flow' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const result = await sql`
      DELETE FROM flows WHERE id = ${id}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Flow not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting flow:', error)
    return Response.json({ error: 'Failed to delete flow' }, { status: 500 })
  }
}