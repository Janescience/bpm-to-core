import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const product = searchParams.get('product')
    const limit = searchParams.get('limit') || '10'
    
    let result
    if (product) {
      result = await sql`
        SELECT id, app_no, created_date, product, 
               LEFT(json_data, 100) as json_preview
        FROM api_log 
        WHERE product = ${product}
        ORDER BY created_date DESC
        LIMIT ${parseInt(limit)}
      `
    } else {
      result = await sql`
        SELECT id, app_no, created_date, product,
               LEFT(json_data, 100) as json_preview
        FROM api_log 
        ORDER BY created_date DESC
        LIMIT ${parseInt(limit)}
      `
    }
    
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { log_id } = await request.json()
    
    const result = await sql`
      SELECT * FROM api_log WHERE id = ${log_id}
    `
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
