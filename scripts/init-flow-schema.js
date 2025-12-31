const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
})

async function initFlowSchema() {
  try {
    console.log('Initializing Flow Chart database schema...')

    const schemaPath = path.join(__dirname, '../lib/flowchartSchema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    const queries = schema
      .split(';')
      .filter(query => query.trim())
      .map(query => query.trim())

    for (const query of queries) {
      if (query) {
        console.log('Executing:', query.substring(0, 50) + '...')
        await pool.query(query)
      }
    }

    console.log('Flow Chart schema initialized successfully!')

    // Insert some sample nodes for testing
    const sampleNodes = [
      {
        name: 'Sample Product Node',
        type: 'product',
        config: { productId: 1 },
        api_path: '/api/products/process'
      },
      {
        name: 'Sample Template Node',
        type: 'template',
        config: { templateId: 1 },
        api_path: '/api/templates/process'
      },
      {
        name: 'Data Validator',
        type: 'custom',
        config: {},
        api_path: '/api/validate',
        external_api_url: 'https://api.example.com/validate'
      },
      {
        name: 'Database Logger',
        type: 'custom',
        config: {},
        database_table: 'activity_logs'
      }
    ]

    for (const node of sampleNodes) {
      try {
        await pool.query(`
          INSERT INTO nodes (name, type, config, api_path, database_table, external_api_url)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          node.name,
          node.type,
          JSON.stringify(node.config),
          node.api_path || null,
          node.database_table || null,
          node.external_api_url || null
        ])
        console.log(`Created sample node: ${node.name}`)
      } catch (err) {
        if (err.code === '23505') {
          console.log(`Sample node already exists: ${node.name}`)
        } else {
          throw err
        }
      }
    }

  } catch (error) {
    console.error('Error initializing schema:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  initFlowSchema()
}

module.exports = { initFlowSchema }