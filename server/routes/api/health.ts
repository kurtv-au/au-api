import { eventHandler } from 'h3'
import { getPool } from '../../utils/database'

/**
 * GET /api/health
 * Health check endpoint that verifies database connectivity
 */
export default eventHandler(async (event) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      message: ''
    }
  }

  try {
    // Test database connection
    const pool = await getPool()
    const result = await pool.request().query('SELECT 1 as test')
    
    if (result.recordset[0]?.test === 1) {
      health.database.connected = true
      health.database.message = 'Database connection successful'
    }
  } catch (error: any) {
    health.status = 'unhealthy'
    health.database.connected = false
    health.database.message = error.message || 'Database connection failed'
    
    // Set unhealthy status code
    event.context.response = {
      statusCode: 503
    }
  }

  return health
})