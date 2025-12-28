import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET - Get version logs for a template
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('template_id')
    
    if (!templateId) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 })
    }
    
    const result = await sql`
      SELECT id, template_id, updated_at, changes, updated_by, version_number
      FROM template_version_log
      WHERE template_id = ${parseInt(templateId)}
      ORDER BY version_number DESC
      LIMIT 20
    `
    
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create version log
export async function POST(request) {
  try {
    const { template_id, changes, updated_by } = await request.json()
    
    // Get current max version number
    const maxVersionResult = await sql`
      SELECT COALESCE(MAX(version_number), 0) as max_version
      FROM template_version_log
      WHERE template_id = ${template_id}
    `
    
    const nextVersion = maxVersionResult.rows[0].max_version + 1
    
    // Insert new version log
    const result = await sql`
      INSERT INTO template_version_log (template_id, changes, updated_by, version_number)
      VALUES (${template_id}, ${JSON.stringify(changes)}, ${updated_by || 'System'}, ${nextVersion})
      RETURNING *
    `
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
