import { sql } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    // Search parameters
    const searchTerm = searchParams.get('search') || ''
    const searchField = searchParams.get('field') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let countResult, logsResult

    if (searchTerm) {
      switch (searchField) {
        case 'json_file_name':
          countResult = await sql`SELECT COUNT(*) as total FROM bpm_soap_history WHERE json_file_name LIKE ${`%${searchTerm}%`}`
          logsResult = await sql`
            SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
                   reuest_bpm_soap, response_bpm_soap
            FROM bpm_soap_history
            WHERE json_file_name LIKE ${`%${searchTerm}%`}
            ORDER BY created_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          break
        case 'service_url':
          countResult = await sql`SELECT COUNT(*) as total FROM bpm_soap_history WHERE service_url LIKE ${`%${searchTerm}%`}`
          logsResult = await sql`
            SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
                   reuest_bpm_soap, response_bpm_soap
            FROM bpm_soap_history
            WHERE service_url LIKE ${`%${searchTerm}%`}
            ORDER BY created_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          break
        case 'policy_no':
          countResult = await sql`SELECT COUNT(*) as total FROM bpm_soap_history WHERE policy_no LIKE ${`%${searchTerm}%`}`
          logsResult = await sql`
            SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
                   reuest_bpm_soap, response_bpm_soap
            FROM bpm_soap_history
            WHERE policy_no LIKE ${`%${searchTerm}%`}
            ORDER BY created_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          break
        case 'system_type':
          countResult = await sql`SELECT COUNT(*) as total FROM bpm_soap_history WHERE system_type LIKE ${`%${searchTerm}%`}`
          logsResult = await sql`
            SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
                   reuest_bpm_soap, response_bpm_soap
            FROM bpm_soap_history
            WHERE system_type LIKE ${`%${searchTerm}%`}
            ORDER BY created_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          break
        case 'http_status':
          const statusValue = parseInt(searchTerm)
          if (isNaN(statusValue)) {
            return Response.json({ error: 'Invalid HTTP status value' }, { status: 400 })
          }
          countResult = await sql`SELECT COUNT(*) as total FROM bpm_soap_history WHERE http_status = ${statusValue}`
          logsResult = await sql`
            SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
                   reuest_bpm_soap, response_bpm_soap
            FROM bpm_soap_history
            WHERE http_status = ${statusValue}
            ORDER BY created_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          break
        default: // 'all' - search across multiple fields
          const searchPattern = `%${searchTerm}%`
          countResult = await sql`
            SELECT COUNT(*) as total FROM bpm_soap_history
            WHERE json_file_name LIKE ${searchPattern} OR
                  service_url LIKE ${searchPattern} OR
                  policy_no LIKE ${searchPattern} OR
                  system_type LIKE ${searchPattern} OR
                  CAST(http_status AS TEXT) LIKE ${searchPattern}
          `
          logsResult = await sql`
            SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
                   reuest_bpm_soap, response_bpm_soap
            FROM bpm_soap_history
            WHERE json_file_name LIKE ${searchPattern} OR
                  service_url LIKE ${searchPattern} OR
                  policy_no LIKE ${searchPattern} OR
                  system_type LIKE ${searchPattern} OR
                  CAST(http_status AS TEXT) LIKE ${searchPattern}
            ORDER BY created_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `
      }
    } else {
      // No search - get all records
      countResult = await sql`SELECT COUNT(*) as total FROM bpm_soap_history`
      logsResult = await sql`
        SELECT id, json_file_name, json_path, service_url, policy_no, mstr_policy_no, system_type, http_status, created_date,
               reuest_bpm_soap, response_bpm_soap
        FROM bpm_soap_history
        ORDER BY created_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const total = countResult.rows[0].total

    return Response.json({
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching SOAP logs:', error)
    return Response.json({ error: 'Failed to fetch SOAP logs' }, { status: 500 })
  }
}