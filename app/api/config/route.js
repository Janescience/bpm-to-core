/**
 * Config Management API
 *
 * Endpoints for managing configuration parameters (bpm_soap_bocaller_parameters)
 * through UI without code changes
 */

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/config
 * Get all config values for a specific key
 *
 * Query params:
 * - bpm_key: Config key (e.g., "INSURED", "RELATION")
 * - system_type: System type (default: "NL")
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const bpmKey = searchParams.get('bpm_key')
    const systemType = searchParams.get('system_type') || 'NL'

    if (!bpmKey) {
      // Get all config keys with counts
      const result = await sql`
        SELECT bpm_key, system_type, COUNT(*) as count
        FROM bpm_soap_bocaller_parameters
        GROUP BY bpm_key, system_type
        ORDER BY bpm_key, system_type
      `

      return NextResponse.json({
        success: true,
        data: result.rows
      })
    }

    // Get all values for specific key
    const result = await sql`
      SELECT id, bpm_key, input, output, remark as description, system_type
      FROM bpm_soap_bocaller_parameters
      WHERE bpm_key = ${bpmKey}
        AND system_type = ${systemType}
      ORDER BY input
    `

    return NextResponse.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('GET /api/config error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/config
 * Create or update a config value
 *
 * Body:
 * {
 *   bpm_key: "INSURED",
 *   input: "101",
 *   output: "นาย",
 *   description: "Mr.",
 *   system_type: "NL"
 * }
 */
export async function POST(request) {
  try {
    const { bpm_key, input, output, description, system_type = 'NL' } = await request.json()

    // Validate required fields
    if (!bpm_key || !input || !output) {
      return NextResponse.json(
        { success: false, error: 'bpm_key, input, and output are required' },
        { status: 400 }
      )
    }

    // Insert or update
    const result = await sql`
      INSERT INTO bpm_soap_bocaller_parameters
      (bpm_key, input, output, system_type, remark)
      VALUES (${bpm_key}, ${input}, ${output}, ${system_type}, ${description || null})
      ON CONFLICT (bpm_key, input, system_type)
      DO UPDATE SET
        output = EXCLUDED.output,
        remark = EXCLUDED.remark
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('POST /api/config error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/config
 * Update a config value (alias for POST)
 */
export async function PUT(request) {
  return POST(request)
}

/**
 * DELETE /api/config
 * Delete a config value
 *
 * Query params:
 * - id: Record ID
 * OR
 * - bpm_key, input, system_type
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const bpmKey = searchParams.get('bpm_key')
    const input = searchParams.get('input')
    const systemType = searchParams.get('system_type') || 'NL'

    if (id) {
      // Delete by ID
      await sql`
        DELETE FROM bpm_soap_bocaller_parameters
        WHERE id = ${id}
      `
    } else if (bpmKey && input) {
      // Delete by key + input
      await sql`
        DELETE FROM bpm_soap_bocaller_parameters
        WHERE bpm_key = ${bpmKey}
          AND input = ${input}
          AND system_type = ${systemType}
      `
    } else {
      return NextResponse.json(
        { success: false, error: 'Either id or (bpm_key + input) required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Config deleted successfully'
    })

  } catch (error) {
    console.error('DELETE /api/config error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
