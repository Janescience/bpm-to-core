// Dynamic database configuration - automatically detects SQLite or PostgreSQL
const dbType = process.env.DATABASE_TYPE || 'postgres'

let dbImplementation = null

if (dbType === 'sqlite') {
  // SQLite implementation
  const Database = require('better-sqlite3')
  const { mkdir } = require('fs/promises')
  const { dirname } = require('path')

  let db = null

  function getDatabase() {
    if (!db) {
      const dbPath = process.env.DATABASE_PATH || './data/bmp-to-core.db'

      // Create data directory if it doesn't exist
      try {
        require('fs').mkdirSync(dirname(dbPath), { recursive: true })
      } catch (err) {
        // Directory might already exist
      }

      db = new Database(dbPath)
      db.pragma('foreign_keys = ON')
      db.pragma('journal_mode = WAL')
    }
    return db
  }

  dbImplementation = {
    async sql(strings, ...values) {
      const database = getDatabase()
      let query = strings[0]
      const params = []

      for (let i = 0; i < values.length; i++) {
        params.push(values[i])
        query += '?' + strings[i + 1]
      }

      try {
        const trimmedQuery = query.trim().toUpperCase()

        if (trimmedQuery.startsWith('SELECT')) {
          const stmt = database.prepare(query)
          const rows = stmt.all(params)
          return { rows, rowCount: rows.length }
        } else if (trimmedQuery.startsWith('INSERT') && query.toUpperCase().includes('RETURNING')) {
          // Handle INSERT with RETURNING for SQLite
          const insertQuery = query.replace(/\s+RETURNING.*$/i, '')
          const stmt = database.prepare(insertQuery)
          const result = stmt.run(params)

          // Get the inserted row
          const tableName = query.match(/INSERT\s+INTO\s+(\w+)/i)?.[1]
          if (tableName && result.lastInsertRowid) {
            const selectStmt = database.prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
            const insertedRow = selectStmt.get(result.lastInsertRowid)
            return { rows: [insertedRow], rowCount: 1 }
          }
          return { rows: [], rowCount: result.changes }
        } else {
          const stmt = database.prepare(query)
          const result = stmt.run(params)
          return { rows: [], rowCount: result.changes }
        }
      } catch (error) {
        console.error('SQLite Query Error:', error)
        console.error('Query:', query)
        console.error('Params:', params)
        throw error
      }
    },

    async query(text, params = []) {
      const database = getDatabase()
      try {
        const trimmedQuery = text.trim().toUpperCase()
        if (trimmedQuery.startsWith('SELECT')) {
          const stmt = database.prepare(text)
          const rows = stmt.all(params)
          return { rows, rowCount: rows.length }
        } else {
          const stmt = database.prepare(text)
          const result = stmt.run(params)
          return { rows: [], rowCount: result.changes }
        }
      } catch (error) {
        console.error('SQLite Query Error:', error)
        throw error
      }
    }
  }

} else {
  // PostgreSQL implementation (default)
  const pg = require('pg')
  const { Pool } = pg

  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: 5432,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  })

  dbImplementation = {
    async sql(strings, ...values) {
      let query = strings[0]
      const params = []

      for (let i = 0; i < values.length; i++) {
        params.push(values[i])
        query += '$' + (i + 1) + strings[i + 1]
      }

      const result = await pool.query(query, params)
      return { rows: result.rows, rowCount: result.rowCount }
    },

    async query(text, params) {
      const result = await pool.query(text, params)
      return result
    }
  }
}

// Export the functions
export const sql = dbImplementation.sql
export const query = dbImplementation.query
