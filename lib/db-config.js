// Dynamic database configuration based on environment

// Check which database type to use
const dbType = process.env.DATABASE_TYPE || 'postgres'

let dbModule = null

if (dbType === 'sqlite') {
  // Use SQLite
  dbModule = require('./db-sqlite.js')
} else {
  // Use PostgreSQL (default)
  dbModule = require('./db.js')
}

// Export the sql function and other utilities
export const sql = dbModule.sql
export const query = dbModule.query

if (dbModule.closeDatabase) {
  export const closeDatabase = dbModule.closeDatabase
}