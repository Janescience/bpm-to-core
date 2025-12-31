import { sql } from '@/lib/db'

export async function GET() {
  try {
    const result = await sql`
      SELECT
        f.*,
        COUNT(fi.id) as node_count
      FROM flows f
      LEFT JOIN flow_instances fi ON f.id = fi.flow_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `
    return Response.json(result.rows)
  } catch (error) {
    console.error('Error fetching flows:', error)
    return Response.json({ error: 'Failed to fetch flows' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { name, description } = await request.json()

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO flows (name, description)
      VALUES (${name}, ${description})
      RETURNING *
    `

    return Response.json(result.rows[0])
  } catch (error) {
    console.error('Error creating flow:', error)
    return Response.json({ error: 'Failed to create flow' }, { status: 500 })
  }
}