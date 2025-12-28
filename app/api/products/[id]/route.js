import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT p.*, t.template_name, t.wsdl_url
      FROM soap_products p
      JOIN soap_templates t ON p.template_id = t.id
      WHERE p.id = ${id}
    `
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const { product_name, template_id } = await request.json()
    
    const result = await sql`
      UPDATE soap_products 
      SET product_name = ${product_name}, 
          template_id = ${template_id},
          updated_date = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    await sql`DELETE FROM soap_products WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
