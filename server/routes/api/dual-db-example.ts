import { eventHandler } from 'h3'
import { DatabaseManager } from '~/utils/databases'
import consola from 'consola'

// Initialize database manager
DatabaseManager.loadFromEnvironment()
const db = DatabaseManager.getInstance()

/**
 * Example endpoint demonstrating dual database usage
 * This endpoint can query both SQL Server and MySQL databases
 * and return combined results using the new database manager
 */
export default eventHandler(async (event) => {
  const results: any = {
    success: true,
    timestamp: new Date().toISOString(),
    databases: {
      intelligent: {
        connected: false,
        data: null,
        error: null
      },
      absentee: {
        connected: false,
        data: null,
        error: null
      }
    }
  }

  // Try intelligent database (MSSQL) connection
  try {
    const intelligentDb = await db.get('default') // Using default for now, would be 'intelligent' when configured
    const result = await intelligentDb.query<{version: string, serverTime: Date}>(
      'SELECT @@VERSION as version, GETDATE() as serverTime'
    )

    results.databases.intelligent.connected = true
    results.databases.intelligent.data = {
      version: result.rows[0]?.version,
      serverTime: result.rows[0]?.serverTime
    }
  } catch (error) {
    consola.error('Intelligent database query error:', error)
    results.databases.intelligent.error = error instanceof Error
      ? error.message
      : 'Intelligent database connection failed'
  }

  // Try absentee database (MySQL) connection if configured
  try {
    if (db.has('absentee')) {
      const absenteeDb = await db.get('absentee')
      const result = await absenteeDb.query<{version: string, serverTime: Date}>(
        'SELECT VERSION() as version, NOW() as serverTime'
      )

      results.databases.absentee.connected = true
      results.databases.absentee.data = {
        version: result.rows[0]?.version,
        serverTime: result.rows[0]?.serverTime
      }
    } else {
      results.databases.absentee.error = 'Absentee database not configured'
    }
  } catch (error) {
    consola.error('Absentee database query error:', error)
    results.databases.absentee.error = error instanceof Error
      ? error.message
      : 'Absentee database connection failed'
  }

  // Determine overall success
  results.success = results.databases.intelligent.connected ||
                   results.databases.absentee.connected

  return results
})