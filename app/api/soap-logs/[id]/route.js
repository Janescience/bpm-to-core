import { sql } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const result = await sql`
      SELECT *
      FROM bpm_soap_history
      WHERE id = ${id}
    `

    if (result.rows.length === 0) {
      return Response.json({ error: 'SOAP log not found' }, { status: 404 })
    }

    return Response.json(result.rows[0])

  } catch (error) {
    console.error('Error fetching SOAP log details:', error)
    return Response.json({ error: 'Failed to fetch SOAP log details' }, { status: 500 })
  }
}