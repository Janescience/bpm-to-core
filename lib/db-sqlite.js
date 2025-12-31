import Database from 'better-sqlite3'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

let db = null

function getDatabase() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || './data/bpm-to-core.db'

    // Create data directory if it doesn't exist
    try {
      mkdir(dirname(dbPath), { recursive: true })
    } catch (err) {
      // Directory might already exist
    }

    db = new Database(dbPath)

    // Enable foreign keys
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
  }

  return db
}

export async function sql(strings, ...values) {
  const database = getDatabase()

  // Template literal tag function to mimic Vercel's sql
  let query = strings[0]
  const params = []

  for (let i = 0; i < values.length; i++) {
    params.push(values[i])
    // SQLite uses ?1, ?2, etc. for parameters
    query += '?' + (i + 1) + strings[i + 1]
  }

  try {
    // Detect if it's a SELECT query
    const trimmedQuery = query.trim().toUpperCase()

    if (trimmedQuery.startsWith('SELECT')) {
      const stmt = database.prepare(query)
      const rows = stmt.all(...params)
      return { rows, rowCount: rows.length }
    } else if (trimmedQuery.startsWith('INSERT')) {
      const stmt = database.prepare(query)
      const result = stmt.run(...params)

      // For INSERT with RETURNING, we need to fetch the inserted row
      if (query.toUpperCase().includes('RETURNING')) {
        const selectQuery = query.replace(/INSERT.*VALUES.*RETURNING/i, 'SELECT')
        const selectStmt = database.prepare(`SELECT * FROM ${getTableFromQuery(query)} WHERE rowid = ?`)
        const insertedRow = selectStmt.get(result.lastInsertRowid)
        return { rows: [insertedRow], rowCount: 1 }
      }

      return { rows: [], rowCount: result.changes }
    } else {
      const stmt = database.prepare(query)
      const result = stmt.run(...params)
      return { rows: [], rowCount: result.changes }
    }
  } catch (error) {
    console.error('SQLite Query Error:', error)
    console.error('Query:', query)
    console.error('Params:', params)
    throw error
  }
}

function getTableFromQuery(query) {
  const match = query.match(/INSERT\s+INTO\s+(\w+)/i)
  return match ? match[1] : 'unknown'
}

export async function query(text, params) {
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

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}