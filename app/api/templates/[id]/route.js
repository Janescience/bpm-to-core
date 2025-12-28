import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT * FROM soap_templates WHERE id = ${id}
    `
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const { template_name, wsdl_url, soap_user, soap_password, xml_structure } = await request.json()
    
    const result = await sql`
      UPDATE soap_templates 
      SET template_name = ${template_name}, 
          wsdl_url = ${wsdl_url}, 
          soap_user = ${soap_user}, 
          soap_password = ${soap_password},
          xml_structure = ${JSON.stringify(xml_structure)},
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
    await sql`DELETE FROM soap_templates WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
