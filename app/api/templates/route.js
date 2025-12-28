import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await sql`
      SELECT id, template_name, wsdl_url, created_date, updated_date
      FROM soap_templates
      ORDER BY created_date DESC
    `
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { template_name, wsdl_url, soap_endpoint, soap_user, soap_password, xml_structure } = await request.json()
    
    const result = await sql`
      INSERT INTO soap_templates (template_name, wsdl_url, soap_endpoint, soap_user, soap_password, xml_structure)
      VALUES (${template_name}, ${wsdl_url}, ${soap_endpoint}, ${soap_user}, ${soap_password}, ${JSON.stringify(xml_structure)})
      RETURNING *
    `
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
