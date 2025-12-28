/**
 * Batch Config Import API
 *
 * For importing multiple config values at once
 */

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * POST /api/config/batch
 * Batch import config values
 *
 * Body:
 * {
 *   bpm_key: "INSURED",
 *   system_type: "NL",
 *   mappings: [
 *     { input: "101", output: "นาย", description: "Mr." },
 *     { input: "102", output: "นาง", description: "Mrs." },
 *     { input: "103", output: "นางสาว", description: "Miss" }
 *   ]
 * }
 */
export async function POST(request) {
  try {
    const { bpm_key, system_type = 'NL', mappings } = await request.json()

    // Validate
    if (!bpm_key || !mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { success: false, error: 'bpm_key and mappings array are required' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Process each mapping
    for (const mapping of mappings) {
      const { input, output, description } = mapping

      if (!input || !output) {
        errors.push({ mapping, error: 'input and output are required' })
        continue
      }

      try {
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

        results.push(result.rows[0])
      } catch (error) {
        errors.push({ mapping, error: error.message })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      inserted: results.length,
      errors: errors.length,
      data: results,
      errorDetails: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('POST /api/config/batch error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/config/batch
 * Batch delete config values for a specific key
 *
 * Query params:
 * - bpm_key: Config key to delete all values
 * - system_type: System type (default: "NL")
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const bpmKey = searchParams.get('bpm_key')
    const systemType = searchParams.get('system_type') || 'NL'

    if (!bpmKey) {
      return NextResponse.json(
        { success: false, error: 'bpm_key is required' },
        { status: 400 }
      )
    }

    const result = await sql`
      DELETE FROM bpm_soap_bocaller_parameters
      WHERE bpm_key = ${bpmKey}
        AND system_type = ${systemType}
    `

    return NextResponse.json({
      success: true,
      message: `Deleted all configs for ${bpmKey}`,
      deletedCount: result.rowCount
    })

  } catch (error) {
    console.error('DELETE /api/config/batch error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
