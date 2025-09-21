import { eventHandler } from 'h3'
import { db } from '~/utils/databases'
import consola from 'consola'

/**
 * Aggregate health check for all databases
 */
export default eventHandler(async (event) => {
  const healthChecks: Record<string, any> = {}
  let overallHealthy = true

  // Get all registered databases
  const databases = db.getRegisteredDatabases()

  // Test each database
  for (const name of databases) {
    try {
      const isHealthy = await db.testConnection(name)
      const isConnected = db.isConnected(name)

      healthChecks[name] = {
        healthy: isHealthy,
        connected: isConnected,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      }

      if (!isHealthy) {
        overallHealthy = false
      }
    } catch (error) {
      consola.error(`Health check failed for database '${name}':`, error)
      healthChecks[name] = {
        healthy: false,
        connected: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
      overallHealthy = false
    }
  }

  // Get connection statistics
  const stats = db.getStats()

  return {
    success: overallHealthy,
    timestamp: new Date().toISOString(),
    databases: healthChecks,
    statistics: stats,
    summary: {
      total: databases.length,
      healthy: Object.values(healthChecks).filter((h: any) => h.healthy).length,
      unhealthy: Object.values(healthChecks).filter((h: any) => !h.healthy).length,
      connected: db.getConnectedDatabases().length
    }
  }
})