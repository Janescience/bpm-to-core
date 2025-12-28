import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')
    
    const result = await sql`
      SELECT * FROM soap_product_mappings 
      WHERE product_id = ${product_id}
      ORDER BY xml_path
    `
    
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const mappings = await request.json()

    for (const mapping of mappings) {
      await sql`
        INSERT INTO soap_product_mappings
        (product_id, xml_path, json_field, parent_node, is_required, default_value,
         function_type, function_params, description, is_active)
        VALUES (
          ${mapping.product_id},
          ${mapping.xml_path},
          ${mapping.json_field},
          ${mapping.parent_node},
          ${mapping.is_required},
          ${mapping.default_value},
          ${mapping.function_type || 'DIRECT'},
          ${mapping.function_params ? JSON.stringify(mapping.function_params) : '{}'},
          ${mapping.description || null},
          ${mapping.is_active !== undefined ? mapping.is_active : true}
        )
        ON CONFLICT (product_id, xml_path)
        DO UPDATE SET
          json_field = EXCLUDED.json_field,
          parent_node = EXCLUDED.parent_node,
          is_required = EXCLUDED.is_required,
          default_value = EXCLUDED.default_value,
          function_type = EXCLUDED.function_type,
          function_params = EXCLUDED.function_params,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
