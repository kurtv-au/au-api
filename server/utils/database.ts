import sql, { ConnectionPool, config as SqlConfig, IResult } from 'mssql'

// Database configuration from environment variables
const dbConfig: SqlConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Use encryption for Azure
    trustServerCertificate: process.env.NODE_ENV === 'development', // For local dev
    enableArithAbort: true
  }
}

// Connection pool singleton
let pool: ConnectionPool | null = null

/**
 * Get or create database connection pool
 */
export async function getPool(): Promise<ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(dbConfig)
    await pool.connect()
    console.log('Database connection pool created')
  }
  return pool
}

/**
 * Execute a query with parameters
 * @param query SQL query string
 * @param params Query parameters object
 */
export async function query<T = any>(
  query: string,
  params?: Record<string, any>
): Promise<IResult<T>> {
  const pool = await getPool()
  const request = pool.request()
  
  // Add parameters if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })
  }
  
  return await request.query<T>(query)
}

/**
 * Execute a stored procedure
 * @param procedureName Name of the stored procedure
 * @param params Procedure parameters
 */
export async function execute<T = any>(
  procedureName: string,
  params?: Record<string, any>
): Promise<IResult<T>> {
  const pool = await getPool()
  const request = pool.request()
  
  // Add parameters if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })
  }
  
  return await request.execute<T>(procedureName)
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
    console.log('Database connection pool closed')
  }
}

// Export sql types for use in other modules
export { sql }