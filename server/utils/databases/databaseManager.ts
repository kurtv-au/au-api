/**
 * Database Manager - Central registry for all database connections
 */

import consola from 'consola'
import { IDatabase, DatabaseType, AnyDatabaseConfig, DatabaseError } from './interfaces'
import { MSSQLConnection } from './connections/mssql'
import { MySQLConnection } from './connections/mysql'
import { PostgreSQLConnection } from './connections/postgres'

/**
 * Database Manager singleton class
 */
export class DatabaseManager {
  private static instance: DatabaseManager
  private connections: Map<string, IDatabase> = new Map()
  private configs: Map<string, AnyDatabaseConfig> = new Map()

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  /**
   * Register a database configuration
   */
  register(config: AnyDatabaseConfig): void {
    if (this.configs.has(config.name)) {
      consola.warn(`Database configuration '${config.name}' already registered, overwriting...`)
    }

    this.configs.set(config.name, config)
    consola.info(`Database configuration '${config.name}' registered`)
  }

  /**
   * Get a database connection by name
   */
  async get(name: string): Promise<IDatabase> {
    // Check if connection already exists
    let connection = this.connections.get(name)
    if (connection) {
      return connection
    }

    // Get configuration
    const config = this.configs.get(name)
    if (!config) {
      throw new DatabaseError(
        `No configuration found for database: ${name}`,
        name,
        DatabaseType.MSSQL // Default type for error
      )
    }

    // Check if database is enabled
    if (config.enabled === false) {
      throw new DatabaseError(
        `Database '${name}' is disabled`,
        name,
        config.type
      )
    }

    // Create connection based on type
    connection = this.createConnection(config)

    // Connect and store
    await connection.connect()
    this.connections.set(name, connection)

    return connection
  }

  /**
   * Get a database connection without connecting (for testing)
   */
  getUnconnected(name: string): IDatabase {
    const config = this.configs.get(name)
    if (!config) {
      throw new DatabaseError(
        `No configuration found for database: ${name}`,
        name,
        DatabaseType.MSSQL
      )
    }

    return this.createConnection(config)
  }

  /**
   * Check if a database is registered
   */
  has(name: string): boolean {
    return this.configs.has(name)
  }

  /**
   * Check if a database is connected
   */
  isConnected(name: string): boolean {
    return this.connections.has(name)
  }

  /**
   * Get all registered database names
   */
  getRegisteredDatabases(): string[] {
    return Array.from(this.configs.keys())
  }

  /**
   * Get all connected database names
   */
  getConnectedDatabases(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * Test a specific database connection
   */
  async testConnection(name: string): Promise<boolean> {
    try {
      const db = await this.get(name)
      return await db.testConnection()
    } catch (error) {
      consola.error(`Failed to test connection for database '${name}':`, error)
      return false
    }
  }

  /**
   * Test all registered database connections
   */
  async testAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    for (const name of this.getRegisteredDatabases()) {
      const config = this.configs.get(name)!
      if (config.enabled === false) {
        results[name] = false
        continue
      }

      results[name] = await this.testConnection(name)
    }

    return results
  }

  /**
   * Disconnect a specific database
   */
  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name)
    if (connection) {
      await connection.disconnect()
      this.connections.delete(name)
      consola.info(`Database '${name}' disconnected`)
    }
  }

  /**
   * Disconnect all databases
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(name =>
      this.disconnect(name)
    )
    await Promise.all(disconnectPromises)
    consola.info('All database connections closed')
  }

  /**
   * Get connection statistics for all databases
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {}

    for (const [name, connection] of this.connections.entries()) {
      if (connection.getStats) {
        stats[name] = connection.getStats()
      }
    }

    return stats
  }

  /**
   * Create a connection instance based on configuration type
   */
  private createConnection(config: AnyDatabaseConfig): IDatabase {
    switch (config.type) {
      case DatabaseType.MSSQL:
        return new MSSQLConnection(config)

      case DatabaseType.MySQL:
        return new MySQLConnection(config)

      case DatabaseType.PostgreSQL:
        return new PostgreSQLConnection(config)

      default:
        throw new Error(`Unsupported database type: ${(config as any).type}`)
    }
  }

  /**
   * Load configurations from environment variables
   */
  static loadFromEnvironment(): void {
    const manager = DatabaseManager.getInstance()

    // Intelligent Database (MSSQL)
    if (process.env.DB_INTELLIGENT_DATABASE) {
      manager.register({
        name: 'intelligent',
        type: DatabaseType.MSSQL,
        server: process.env.DB_INTELLIGENT_SERVER || 'localhost',
        port: parseInt(process.env.DB_INTELLIGENT_PORT || '1433'),
        database: process.env.DB_INTELLIGENT_DATABASE,
        user: process.env.DB_INTELLIGENT_USER || '',
        password: process.env.DB_INTELLIGENT_PASSWORD || '',
        encrypt: process.env.DB_INTELLIGENT_ENCRYPT === 'true',
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enabled: process.env.DB_INTELLIGENT_ENABLED !== 'false',
        poolConfig: {
          min: 2,
          max: 10
        }
      })
    }

    // Logger Database (MSSQL) - Uses same server as intelligent with different database
    if (process.env.DB_LOGGER_DATABASE) {
      manager.register({
        name: 'logger',
        type: DatabaseType.MSSQL,
        server: process.env.DB_LOGGER_SERVER || process.env.DB_SERVER || 'localhost',
        port: parseInt(process.env.DB_LOGGER_PORT || process.env.DB_PORT || '1433'),
        database: process.env.DB_LOGGER_DATABASE,
        user: process.env.DB_LOGGER_USER || process.env.DB_USER || '',
        password: process.env.DB_LOGGER_PASSWORD || process.env.DB_PASSWORD || '',
        encrypt: process.env.DB_LOGGER_ENCRYPT === 'true' || process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enabled: process.env.DB_LOGGER_ENABLED !== 'false',
        poolConfig: {
          min: 1,
          max: 5
        }
      })
    }

    // Unity Logger Database (MSSQL)
    if (process.env.DB_UNITY_LOGGER_DATABASE) {
      manager.register({
        name: 'unity-logger',
        type: DatabaseType.MSSQL,
        server: process.env.DB_UNITY_LOGGER_SERVER || process.env.DB_INTELLIGENT_SERVER || 'localhost',
        port: parseInt(process.env.DB_UNITY_LOGGER_PORT || process.env.DB_INTELLIGENT_PORT || '1433'),
        database: process.env.DB_UNITY_LOGGER_DATABASE,
        user: process.env.DB_UNITY_LOGGER_USER || process.env.DB_INTELLIGENT_USER || '',
        password: process.env.DB_UNITY_LOGGER_PASSWORD || process.env.DB_INTELLIGENT_PASSWORD || '',
        encrypt: process.env.DB_UNITY_LOGGER_ENCRYPT === 'true' || process.env.DB_INTELLIGENT_ENCRYPT === 'true',
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enabled: process.env.DB_UNITY_LOGGER_ENABLED !== 'false',
        poolConfig: {
          min: 1,
          max: 5
        }
      })
    }

    // MDR Database (MSSQL) - Future
    if (process.env.DB_MDR_DATABASE) {
      manager.register({
        name: 'mdr',
        type: DatabaseType.MSSQL,
        server: process.env.DB_MDR_SERVER || process.env.DB_INTELLIGENT_SERVER || 'localhost',
        port: parseInt(process.env.DB_MDR_PORT || process.env.DB_INTELLIGENT_PORT || '1433'),
        database: process.env.DB_MDR_DATABASE,
        user: process.env.DB_MDR_USER || process.env.DB_INTELLIGENT_USER || '',
        password: process.env.DB_MDR_PASSWORD || process.env.DB_INTELLIGENT_PASSWORD || '',
        encrypt: process.env.DB_MDR_ENCRYPT === 'true' || process.env.DB_INTELLIGENT_ENCRYPT === 'true',
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enabled: process.env.DB_MDR_ENABLED === 'true', // Default to disabled
        poolConfig: {
          min: 1,
          max: 5
        }
      })
    }

    // Absentee Database (MySQL)
    if (process.env.DB_ABSENTEE_DATABASE) {
      manager.register({
        name: 'absentee',
        type: DatabaseType.MySQL,
        host: process.env.DB_ABSENTEE_HOST || 'localhost',
        port: parseInt(process.env.DB_ABSENTEE_PORT || '3306'),
        database: process.env.DB_ABSENTEE_DATABASE,
        user: process.env.DB_ABSENTEE_USER || '',
        password: process.env.DB_ABSENTEE_PASSWORD || '',
        enabled: process.env.DB_ABSENTEE_ENABLED !== 'false',
        poolConfig: {
          min: 2,
          max: 8
        }
      })
    }

    // Engage Database (PostgreSQL) - Future
    if (process.env.DB_ENGAGE_DATABASE) {
      manager.register({
        name: 'engage',
        type: DatabaseType.PostgreSQL,
        host: process.env.DB_ENGAGE_HOST || 'localhost',
        port: parseInt(process.env.DB_ENGAGE_PORT || '5432'),
        database: process.env.DB_ENGAGE_DATABASE,
        user: process.env.DB_ENGAGE_USER || '',
        password: process.env.DB_ENGAGE_PASSWORD || '',
        ssl: process.env.DB_ENGAGE_SSL === 'true',
        enabled: process.env.DB_ENGAGE_ENABLED === 'true', // Default to disabled
        poolConfig: {
          min: 2,
          max: 10
        }
      })
    }

    // For backward compatibility - register the default SQL Server database
    if (process.env.DB_DATABASE) {
      manager.register({
        name: 'default',
        type: DatabaseType.MSSQL,
        server: process.env.DB_SERVER || 'localhost',
        port: parseInt(process.env.DB_PORT || '1433'),
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enabled: true,
        poolConfig: {
          min: 0,
          max: 10
        }
      })
    }

    // For backward compatibility - register the MySQL database
    if (process.env.MYSQL_DATABASE) {
      manager.register({
        name: 'mysql',
        type: DatabaseType.MySQL,
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USER || '',
        password: process.env.MYSQL_PASSWORD || '',
        enabled: true,
        poolConfig: {
          min: 0,
          max: 10
        }
      })
    }
  }
}

// Create singleton instance
export const db = DatabaseManager.getInstance()