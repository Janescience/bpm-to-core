const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const { mkdir } = require('fs/promises')

async function initSQLite() {
  try {
    const dbPath = process.env.DATABASE_PATH || './data/bpm-to-core.db'
    const dataDir = path.dirname(dbPath)

    console.log('Creating SQLite database at:', dbPath)

    // Create data directory
    await mkdir(dataDir, { recursive: true })

    // Initialize database
    const db = new Database(dbPath)

    // Enable foreign keys and WAL mode
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')

    console.log('Reading schema file...')
    const schemaPath = path.join(__dirname, '../lib/flowchartSchema-sqlite.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    console.log(`Executing ${statements.length} SQL statements...`)

    // Execute each statement
    for (const statement of statements) {
      try {
        db.exec(statement)
        console.log('✓', statement.substring(0, 50) + '...')
      } catch (error) {
        console.error('Error executing statement:', statement.substring(0, 100))
        console.error(error.message)
      }
    }

    // Test the database
    console.log('\nTesting database...')
    const flowsCount = db.prepare('SELECT COUNT(*) as count FROM flows').get()
    const nodesCount = db.prepare('SELECT COUNT(*) as count FROM nodes').get()

    console.log(`✓ Flows table: ${flowsCount.count} records`)
    console.log(`✓ Nodes table: ${nodesCount.count} records`)

    db.close()

    console.log('\n🎉 SQLite database initialized successfully!')
    console.log(`Database location: ${path.resolve(dbPath)}`)
    console.log('\nNext steps:')
    console.log('1. Add DATABASE_TYPE=sqlite to your .env.local')
    console.log(`2. Add DATABASE_PATH=${dbPath} to your .env.local`)
    console.log('3. Start your Next.js application: npm run dev')

  } catch (error) {
    console.error('❌ Error initializing SQLite database:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initSQLite()
}

module.exports = initSQLite