/**
 * MSSQL database connection implementation
 */

import sql, { ConnectionPool, config as SqlConfig, IResult, Transaction as MSSQLTransaction } from 'mssql'
import consola from 'consola'
import {
  IDatabase,
  DatabaseType,
  MSSQLConfig,
  QueryResult,
  Transaction,
  ConnectionStats,
  ResultAdapter,
  DatabaseError
} from '../interfaces'

/**
 * MSSQL database connection class
 */
export class MSSQLConnection implements IDatabase {
  public readonly name: string
  public readonly type = DatabaseType.MSSQL
  private config: SqlConfig
  private pool: ConnectionPool | null = null
  private connected = false

  constructor(config: MSSQLConfig) {
    this.name = config.name

    // Build MSSQL config from our config interface
    this.config = {
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      pool: {
        max: config.poolConfig?.max || 10,
        min: config.poolConfig?.min || 0,
        idleTimeoutMillis: config.poolConfig?.idleTimeoutMillis || 30000,
        acquireTimeoutMillis: config.poolConfig?.acquireTimeoutMillis || 30000
      },
      options: {
        encrypt: config.encrypt || false,
        trustServerCertificate: config.trustServerCertificate !== false,
        enableArithAbort: true,
        ...config.options
      }
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
      this.pool = new sql.ConnectionPool(this.config)
      await this.pool.connect()
      this.connected = true
      consola.success(`[${this.name}] MSSQL connection established`)
    } catch (error) {
      consola.error(`[${this.name}] MSSQL connection failed:`, error)
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
      await this.pool.close()
      this.pool = null
      this.connected = false
      consola.info(`[${this.name}] MSSQL connection closed`)
    } catch (error) {
      consola.error(`[${this.name}] Error closing MSSQL connection:`, error)
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
  async query<T = any>(query: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) {
      await this.connect()
    }

    try {
      const request = this.pool!.request()

      // Add parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value)
        })
      }

      const result = await request.query<T>(query)
      return ResultAdapter.fromMSSQL(result)
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
  async execute<T = any>(procedure: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) {
      await this.connect()
    }

    try {
      const request = this.pool!.request()

      // Add parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value)
        })
      }

      const result = await request.execute<T>(procedure)
      return ResultAdapter.fromMSSQL(result)
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

    const transaction = new sql.Transaction(this.pool!)
    await transaction.begin()

    return {
      query: async <T = any>(sql: string, params?: any): Promise<QueryResult<T>> => {
        const request = transaction.request()

        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            request.input(key, value)
          })
        }

        const result = await request.query<T>(sql)
        return ResultAdapter.fromMSSQL(result)
      },
      commit: async () => {
        await transaction.commit()
      },
      rollback: async () => {
        await transaction.rollback()
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

      const result = await this.query('SELECT 1 as test')
      return result.rows.length > 0
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

    // MSSQL doesn't provide detailed pool stats directly
    // These are approximations based on pool configuration
    return {
      active: this.connected ? 1 : 0,
      idle: this.connected ? (this.config.pool?.min || 0) : 0,
      total: this.config.pool?.max || 10,
      waiting: 0
    }
  }
}