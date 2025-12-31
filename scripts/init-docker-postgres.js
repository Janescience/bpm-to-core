import { execSync } from 'child_process'
import { sql } from '../lib/db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDockerPostgreSQL() {
  try {
    console.log('🐳 Starting Docker PostgreSQL setup...')

    // Check if Docker is running
    try {
      execSync('docker --version', { stdio: 'pipe' })
    } catch (error) {
      console.error('❌ Docker is not installed or not running.')
      console.log('Please install Docker Desktop from: https://docker.com/get-started')
      process.exit(1)
    }

    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...')
    execSync('docker-compose up -d postgres', { stdio: 'inherit' })

    // Wait for PostgreSQL to be ready
    console.log('Waiting for PostgreSQL to be ready...')
    let retries = 30
    while (retries > 0) {
      try {
        execSync('docker-compose exec postgres pg_isready -U admin -d bmp_to_core', { stdio: 'pipe' })
        break
      } catch (error) {
        retries--
        console.log(`Retrying... (${30 - retries}/30)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (retries === 0) {
      console.error('❌ PostgreSQL failed to start after 60 seconds')
      process.exit(1)
    }

    console.log('✓ PostgreSQL is ready!')

    // Initialize schema
    console.log('Initializing database schema...')
    const schemaPath = path.join(__dirname, '../lib/flowchartSchema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Execute schema
    const queries = schema
      .split(';')
      .filter(query => query.trim())
      .map(query => query.trim())

    for (const query of queries) {
      if (query) {
        console.log('Executing:', query.substring(0, 50) + '...')
        await sql([query], [])
      }
    }

    // Test connection
    const result = await sql`SELECT version()`
    console.log('✓ Database connection test:', result.rows[0].version.substring(0, 50) + '...')

    console.log('\n🎉 Docker PostgreSQL setup completed!')
    console.log('\nContainer status:')
    execSync('docker-compose ps', { stdio: 'inherit' })

    console.log('\nNext steps:')
    console.log('1. Add DATABASE_TYPE=postgres to your .env.local')
    console.log('2. Add PostgreSQL credentials to your .env.local')
    console.log('3. Start your Next.js application: npm run dev')
    console.log('\nOptional:')
    console.log('- Start pgAdmin: docker-compose --profile tools up -d')
    console.log('- Access pgAdmin at: http://localhost:8080 (admin@admin.com / admin123)')

  } catch (error) {
    console.error('❌ Error setting up Docker PostgreSQL:', error)
    process.exit(1)
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  initDockerPostgreSQL()
}

export default initDockerPostgreSQL