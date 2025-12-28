import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await sql`
      SELECT p.*, t.template_name 
      FROM soap_products p
      JOIN soap_templates t ON p.template_id = t.id
      ORDER BY p.created_date DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { template_id, product_name } = await request.json()
    
    const result = await sql`
      INSERT INTO soap_products (template_id, product_name)
      VALUES (${template_id}, ${product_name})
      RETURNING *
    `
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
