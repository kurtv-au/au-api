import { eventHandler, getRouterParam } from 'h3'
import { db } from '~/utils/databases'
import consola from 'consola'

/**
 * Dynamic health check for individual databases
 */
export default eventHandler(async (event) => {
  const databaseName = getRouterParam(event, 'database')

  if (!databaseName) {
    return {
      success: false,
      error: 'Database name is required',
      timestamp: new Date().toISOString()
    }
  }

  // Check if database is registered
  if (!db.has(databaseName)) {
    return {
      success: false,
      database: databaseName,
      error: 'Database not registered',
      available: db.getRegisteredDatabases(),
      timestamp: new Date().toISOString()
    }
  }

  try {
    // Get the database connection
    const database = await db.get(databaseName)

    // Test the connection
    const isHealthy = await database.testConnection()

    // Get additional info
    let serverInfo: any = null
    if (isHealthy) {
      try {
        // Try to get server info based on database type
        switch (database.type) {
          case 'mssql':
            const mssqlResult = await database.query('SELECT @@VERSION as version, GETDATE() as serverTime')
            serverInfo = {
              version: mssqlResult.rows[0]?.version,
              serverTime: mssqlResult.rows[0]?.serverTime
            }
            break

          case 'mysql':
            const mysqlResult = await database.query('SELECT VERSION() as version, NOW() as serverTime')
            serverInfo = {
              version: mysqlResult.rows[0]?.version,
              serverTime: mysqlResult.rows[0]?.serverTime
            }
            break

          case 'postgresql':
            const pgResult = await database.query('SELECT version() as version, NOW() as serverTime')
            serverInfo = {
              version: pgResult.rows[0]?.version,
              serverTime: pgResult.rows[0]?.serverTime
            }
            break
        }
      } catch (error) {
        consola.warn(`Could not fetch server info for ${databaseName}:`, error)
      }
    }

    // Get connection stats if available
    const stats = database.getStats ? database.getStats() : null

    return {
      success: isHealthy,
      database: databaseName,
      type: database.type,
      status: isHealthy ? 'healthy' : 'unhealthy',
      connected: db.isConnected(databaseName),
      serverInfo,
      statistics: stats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    consola.error(`Health check error for database '${databaseName}':`, error)

    return {
      success: false,
      database: databaseName,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})