import { sql } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const result = await sql`
      SELECT * FROM nodes WHERE id = ${id}
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching node:', error)
    return Response.json({ error: 'Failed to fetch node' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const {
      name,
      type,
      config = {},
      api_path,
      database_table,
      external_api_url,
      input_mapping = {},
      output_mapping = {}
    } = await request.json()

    const result = await sql`
      UPDATE nodes
      SET
        name = ${name},
        type = ${type},
        config = ${JSON.stringify(config)},
        api_path = ${api_path},
        database_table = ${database_table},
        external_api_url = ${external_api_url},
        input_mapping = ${JSON.stringify(input_mapping)},
        output_mapping = ${JSON.stringify(output_mapping)},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error updating node:', error)
    return Response.json({ error: 'Failed to update node' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const result = await sql`
      DELETE FROM nodes WHERE id = ${id}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting node:', error)
    return Response.json({ error: 'Failed to delete node' }, { status: 500 })
  }
}