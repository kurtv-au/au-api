import { eventHandler } from 'h3'
import { db } from '~/utils/databases'
import consola from 'consola'

/**
 * Test endpoint demonstrating multi-database usage
 */
export default eventHandler(async (event) => {
  const results: Record<string, any> = {
    success: true,
    timestamp: new Date().toISOString(),
    databases: {}
  }

  // Test each registered database
  const databases = db.getRegisteredDatabases()

  for (const name of databases) {
    try {
      // Skip if database is registered but not configured
      if (!db.has(name)) {
        results.databases[name] = {
          status: 'not configured',
          enabled: false
        }
        continue
      }

      // Try to connect and query
      const database = await db.get(name)
      const testResult = await database.testConnection()

      if (testResult) {
        // Run a simple query based on database type
        let queryResult: any = null

        try {
          switch (database.type) {
            case 'mssql':
              queryResult = await database.query('SELECT DB_NAME() as database_name, SYSTEM_USER as current_user')
              break
            case 'mysql':
              queryResult = await database.query('SELECT DATABASE() as database_name, USER() as current_user')
              break
            case 'postgresql':
              queryResult = await database.query('SELECT current_database() as database_name, current_user')
              break
          }
        } catch (queryError) {
          consola.warn(`Query failed for ${name}:`, queryError)
        }

        results.databases[name] = {
          status: 'connected',
          type: database.type,
          enabled: true,
          queryResult: queryResult?.rows?.[0] || null
        }
      } else {
        results.databases[name] = {
          status: 'connection failed',
          type: database.type,
          enabled: true
        }
      }
    } catch (error) {
      consola.error(`Error testing database '${name}':`, error)
      results.databases[name] = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        enabled: false
      }

      // Mark as disabled if it's a future database
      if (name === 'mdr' || name === 'engage') {
        results.databases[name].futureImplementation = true
      }
    }
  }

  // Example of using specific databases
  try {
    // If intelligent database is available, show an example query
    if (db.has('intelligent') && results.databases.intelligent?.status === 'connected') {
      const intelligentDb = await db.get('intelligent')
      const exampleQuery = await intelligentDb.query(
        'SELECT TOP 5 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = @type',
        { type: 'BASE TABLE' }
      )
      results.databases.intelligent.exampleTables = exampleQuery.rows.map((r: any) => r.TABLE_NAME)
    }
  } catch (error) {
    consola.warn('Could not fetch example data from intelligent database:', error)
  }

  return results
})