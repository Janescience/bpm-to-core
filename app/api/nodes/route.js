import { sql } from '@/lib/db'

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM nodes
      ORDER BY created_at DESC
    `
    return Response.json(result.rows)
  } catch (error) {
    console.error('Error fetching nodes:', error)
    return Response.json({ error: 'Failed to fetch nodes' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
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

    if (!name || !type) {
      return Response.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO nodes (
        name, type, config, api_path, database_table,
        external_api_url, input_mapping, output_mapping
      )
      VALUES (
        ${name}, ${type}, ${JSON.stringify(config)}, ${api_path},
        ${database_table}, ${external_api_url},
        ${JSON.stringify(input_mapping)}, ${JSON.stringify(output_mapping)}
      )
      RETURNING *
    `

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error creating node:', error)
    return Response.json({ error: 'Failed to create node' }, { status: 500 })
  }
}