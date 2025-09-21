/**
 * Database utilities main export file
 */

export { DatabaseManager, db } from './databaseManager'
export * from './interfaces'

// Export connection classes for advanced usage
export { MSSQLConnection } from './connections/mssql'
export { MySQLConnection } from './connections/mysql'
export { PostgreSQLConnection } from './connections/postgres'

// Initialize database configurations from environment on import
import { DatabaseManager } from './databaseManager'
import consola from 'consola'

const manager = DatabaseManager.getInstance()
DatabaseManager.loadFromEnvironment()

const databases = manager.getRegisteredDatabases()
if (databases.length > 0) {
  consola.success(`Database manager: registered ${databases.length} database(s): ${databases.join(', ')}`)
}