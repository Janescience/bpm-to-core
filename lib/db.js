import pg from 'pg'
const { Pool } = pg

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

export async function sql(strings, ...values) {
  // Template literal tag function to mimic Vercel's sql
  let query = strings[0]
  const params = []
  
  for (let i = 0; i < values.length; i++) {
    params.push(values[i])
    query += '$' + (i + 1) + strings[i + 1]
  }
  
  const result = await pool.query(query, params)
  return { rows: result.rows, rowCount: result.rowCount }
}

export async function query(text, params) {
  const result = await pool.query(text, params)
  return result
}
