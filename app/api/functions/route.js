/**
 * Custom Functions Management API
 *
 * Manage user-defined transformation functions
 */

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/functions
 * Get all custom functions or a specific function
 *
 * Query params:
 * - function_name: Get specific function by name
 * - active_only: true/false (default: true)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const functionName = searchParams.get('function_name')
    const activeOnly = searchParams.get('active_only') !== 'false'

    let result

    if (functionName) {
      // Get specific function
      result = await sql`
        SELECT
          id,
          function_name,
          description,
          code,
          parameters,
          is_active,
          created_by,
          created_date,
          updated_date
        FROM soap_custom_functions
        WHERE function_name = ${functionName}
      `

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Function not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      })
    } else {
      // Get all functions
      if (activeOnly) {
        result = await sql`
          SELECT
            id,
            function_name,
            description,
            parameters,
            is_active,
            created_by,
            created_date,
            updated_date
          FROM soap_custom_functions
          WHERE is_active = true
          ORDER BY function_name
        `
      } else {
        result = await sql`
          SELECT
            id,
            function_name,
            description,
            parameters,
            is_active,
            created_by,
            created_date,
            updated_date
          FROM soap_custom_functions
          ORDER BY function_name
        `
      }

      return NextResponse.json({
        success: true,
        data: result.rows
      })
    }
  } catch (error) {
    console.error('GET /api/functions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/functions
 * Create a new custom function
 *
 * Body:
 * {
 *   function_name: "myFunction",
 *   description: "Description",
 *   code: "return data.field;",
 *   parameters: [{name: "field", type: "string"}],
 *   created_by: "username"
 * }
 */
export async function POST(request) {
  try {
    const { function_name, description, code, parameters, created_by } = await request.json()

    // Validate required fields
    if (!function_name || !code) {
      return NextResponse.json(
        { success: false, error: 'function_name and code are required' },
        { status: 400 }
      )
    }

    // Validate function name format (alphanumeric and underscore only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(function_name)) {
      return NextResponse.json(
        { success: false, error: 'function_name must be alphanumeric with underscores only' },
        { status: 400 }
      )
    }

    // Basic JavaScript syntax validation
    try {
      new Function('data', 'params', code)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JavaScript code: ' + error.message },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO soap_custom_functions
      (function_name, description, code, parameters, created_by, created_date, updated_date)
      VALUES (
        ${function_name},
        ${description || null},
        ${code},
        ${JSON.stringify(parameters || [])},
        ${created_by || 'system'},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('POST /api/functions error:', error)

    // Check for duplicate function name
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Function name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/functions
 * Update an existing custom function
 *
 * Body:
 * {
 *   id: 123,
 *   function_name: "myFunction",
 *   description: "Updated description",
 *   code: "return data.newField;",
 *   parameters: [{name: "newField", type: "string"}],
 *   is_active: true
 * }
 */
export async function PUT(request) {
  try {
    const { id, function_name, description, code, parameters, is_active } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    // Validate function name format if provided
    if (function_name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(function_name)) {
      return NextResponse.json(
        { success: false, error: 'function_name must be alphanumeric with underscores only' },
        { status: 400 }
      )
    }

    // Validate JavaScript code if provided
    if (code) {
      try {
        new Function('data', 'params', code)
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid JavaScript code: ' + error.message },
          { status: 400 }
        )
      }
    }

    const result = await sql`
      UPDATE soap_custom_functions
      SET
        function_name = COALESCE(${function_name}, function_name),
        description = COALESCE(${description}, description),
        code = COALESCE(${code}, code),
        parameters = COALESCE(${parameters ? JSON.stringify(parameters) : null}, parameters),
        is_active = COALESCE(${is_active}, is_active),
        updated_date = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Function not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('PUT /api/functions error:', error)

    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Function name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/functions
 * Delete a custom function
 *
 * Query params:
 * - id: Function ID
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const result = await sql`
      DELETE FROM soap_custom_functions
      WHERE id = ${id}
      RETURNING *
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Function not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Function deleted successfully',
      data: result.rows[0]
    })

  } catch (error) {
    console.error('DELETE /api/functions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
