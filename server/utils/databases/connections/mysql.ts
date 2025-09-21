/**
 * MySQL database connection implementation
 */

import mysql, { Pool, PoolConnection } from 'mysql2/promise'
import consola from 'consola'
import {
  IDatabase,
  DatabaseType,
  MySQLConfig,
  QueryResult,
  Transaction,
  ConnectionStats,
  ResultAdapter,
  DatabaseError
} from '../interfaces'

/**
 * MySQL database connection class
 */
export class MySQLConnection implements IDatabase {
  public readonly name: string
  public readonly type = DatabaseType.MySQL
  private config: mysql.PoolOptions
  private pool: Pool | null = null
  private connected = false

  constructor(config: MySQLConfig) {
    this.name = config.name

    // Build MySQL config from our config interface
    this.config = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      waitForConnections: config.waitForConnections !== false,
      connectionLimit: config.poolConfig?.max || 10,
      queueLimit: config.queueLimit || 0,
      enableKeepAlive: config.enableKeepAlive !== false,
      keepAliveInitialDelay: config.keepAliveInitialDelay || 0
    }
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.connected && this.pool) {
      return
    }

    try {
      this.pool = mysql.createPool(this.config)

      // Test the connection
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()

      this.connected = true
      consola.success(`[${this.name}] MySQL connection established`)
    } catch (error) {
      consola.error(`[${this.name}] MySQL connection failed:`, error)
      throw new DatabaseError(
        `Failed to connect to database: ${this.name}`,
        this.name,
        this.type,
        error as Error
      )
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.pool) {
      return
    }

    try {
      await this.pool.end()
      this.pool = null
      this.connected = false
      consola.info(`[${this.name}] MySQL connection closed`)
    } catch (error) {
      consola.error(`[${this.name}] Error closing MySQL connection:`, error)
      throw new DatabaseError(
        `Failed to disconnect from database: ${this.name}`,
        this.name,
        this.type,
        error as Error
      )
    }
  }

  /**
   * Execute a query with parameters
   */
  async query<T = any>(sql: string, params?: any): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) {
      await this.connect()
    }

    try {
      // Convert named parameters to positional if needed
      let values: any[] | undefined
      if (params && typeof params === 'object' && !Array.isArray(params)) {
        const converted = this.convertNamedParams(sql, params)
        sql = converted.sql
        values = converted.values
      } else {
        values = params
      }

      const [rows, fields] = await this.pool!.execute<T[]>(sql, values)
      return ResultAdapter.fromMySQL(rows, fields)
    } catch (error) {
      consola.error(`[${this.name}] Query error:`, error)
      throw new DatabaseError(
        `Query failed on database: ${this.name}`,
        this.name,
        this.type,
        error as Error
      )
    }
  }

  /**
   * Execute a stored procedure
   */
  async execute<T = any>(procedure: string, params?: any): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) {
      await this.connect()
    }

    try {
      const sql = `CALL ${procedure}(${params?.length ? params.map(() => '?').join(', ') : ''})`
      const [results] = await this.pool!.execute<any>(sql, params)

      // MySQL stored procedures return results differently
      // First element is usually the result set
      const rows = results[0] || []
      return ResultAdapter.fromMySQL(rows)
    } catch (error) {
      consola.error(`[${this.name}] Stored procedure error:`, error)
      throw new DatabaseError(
        `Stored procedure failed on database: ${this.name}`,
        this.name,
        this.type,
        error as Error
      )
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<Transaction> {
    if (!this.pool || !this.connected) {
      await this.connect()
    }

    const connection = await this.pool!.getConnection()
    await connection.beginTransaction()

    return {
      query: async <T = any>(sql: string, params?: any): Promise<QueryResult<T>> => {
        try {
          // Convert named parameters if needed
          let values: any[] | undefined
          if (params && typeof params === 'object' && !Array.isArray(params)) {
            const converted = this.convertNamedParams(sql, params)
            sql = converted.sql
            values = converted.values
          } else {
            values = params
          }

          const [rows, fields] = await connection.execute<T[]>(sql, values)
          return ResultAdapter.fromMySQL(rows, fields)
        } catch (error) {
          throw new DatabaseError(
            `Transaction query failed on database: ${this.name}`,
            this.name,
            this.type,
            error as Error
          )
        }
      },
      commit: async () => {
        try {
          await connection.commit()
        } finally {
          connection.release()
        }
      },
      rollback: async () => {
        try {
          await connection.rollback()
        } finally {
          connection.release()
        }
      }
    }
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool || !this.connected) {
        await this.connect()
      }

      const connection = await this.pool!.getConnection()
      await connection.ping()
      connection.release()
      return true
    } catch (error) {
      consola.error(`[${this.name}] Connection test failed:`, error)
      return false
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    if (!this.pool) {
      return {
        active: 0,
        idle: 0,
        total: 0,
        waiting: 0
      }
    }

    // MySQL2 doesn't provide direct pool stats, these are approximations
    return {
      active: this.connected ? 1 : 0,
      idle: this.connected ? (this.config.connectionLimit || 10) - 1 : 0,
      total: this.config.connectionLimit || 10,
      waiting: 0
    }
  }

  /**
   * Convert named parameters to positional parameters
   */
  private convertNamedParams(sql: string, params: Record<string, any>): { sql: string; values: any[] } {
    const values: any[] = []
    let formattedSql = sql

    // Sort parameter names by length (longest first) to avoid partial replacements
    const sortedParams = Object.keys(params).sort((a, b) => b.length - a.length)

    for (const key of sortedParams) {
      const regex = new RegExp(`:${key}\\b`, 'g')
      formattedSql = formattedSql.replace(regex, () => {
        values.push(params[key])
        return '?'
      })
    }

    return { sql: formattedSql, values }
  }
}