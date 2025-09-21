/**
 * PostgreSQL database connection implementation
 */

import pg, { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg'
import consola from 'consola'
import {
  IDatabase,
  DatabaseType,
  PostgreSQLConfig,
  QueryResult,
  Transaction,
  ConnectionStats,
  ResultAdapter,
  DatabaseError
} from '../interfaces'

/**
 * PostgreSQL database connection class
 */
export class PostgreSQLConnection implements IDatabase {
  public readonly name: string
  public readonly type = DatabaseType.PostgreSQL
  private config: pg.PoolConfig
  private pool: Pool | null = null
  private connected = false

  constructor(config: PostgreSQLConfig) {
    this.name = config.name

    // Build PostgreSQL config from our config interface
    this.config = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.poolConfig?.max || 10,
      min: config.poolConfig?.min || 0,
      idleTimeoutMillis: config.poolConfig?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.poolConfig?.connectionTimeoutMillis || 2000,
      ssl: config.ssl || false,
      statement_timeout: config.statement_timeout,
      query_timeout: config.query_timeout
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
      this.pool = new pg.Pool(this.config)

      // Test the connection
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()

      this.connected = true
      consola.success(`[${this.name}] PostgreSQL connection established`)

      // Handle pool errors
      this.pool.on('error', (err) => {
        consola.error(`[${this.name}] PostgreSQL pool error:`, err)
      })
    } catch (error) {
      consola.error(`[${this.name}] PostgreSQL connection failed:`, error)
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
      consola.info(`[${this.name}] PostgreSQL connection closed`)
    } catch (error) {
      consola.error(`[${this.name}] Error closing PostgreSQL connection:`, error)
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

      const result = await this.pool!.query<T>(sql, values)
      return ResultAdapter.fromPostgreSQL(result as any)
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
   * Execute a stored procedure (PostgreSQL uses functions)
   */
  async execute<T = any>(procedure: string, params?: any): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) {
      await this.connect()
    }

    try {
      // PostgreSQL calls functions with SELECT or CALL
      const placeholders = params?.length ? params.map((_, i: number) => `$${i + 1}`).join(', ') : ''
      const sql = `SELECT * FROM ${procedure}(${placeholders})`

      const result = await this.pool!.query<T>(sql, params)
      return ResultAdapter.fromPostgreSQL(result as any)
    } catch (error) {
      consola.error(`[${this.name}] Function call error:`, error)
      throw new DatabaseError(
        `Function call failed on database: ${this.name}`,
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

    const client = await this.pool!.connect()
    await client.query('BEGIN')

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

          const result = await client.query<T>(sql, values)
          return ResultAdapter.fromPostgreSQL(result as any)
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
          await client.query('COMMIT')
        } finally {
          client.release()
        }
      },
      rollback: async () => {
        try {
          await client.query('ROLLBACK')
        } finally {
          client.release()
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

      const result = await this.pool!.query('SELECT 1 as test')
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

    // PostgreSQL pool provides some stats
    const poolStats = (this.pool as any)
    return {
      active: poolStats.totalCount || 0,
      idle: poolStats.idleCount || 0,
      total: this.config.max || 10,
      waiting: poolStats.waitingCount || 0
    }
  }

  /**
   * Convert named parameters to positional parameters for PostgreSQL
   */
  private convertNamedParams(sql: string, params: Record<string, any>): { sql: string; values: any[] } {
    const values: any[] = []
    let formattedSql = sql
    let paramIndex = 1

    // Sort parameter names by length (longest first) to avoid partial replacements
    const sortedParams = Object.keys(params).sort((a, b) => b.length - a.length)

    for (const key of sortedParams) {
      const regex = new RegExp(`:${key}\\b`, 'g')
      formattedSql = formattedSql.replace(regex, () => {
        values.push(params[key])
        return `$${paramIndex++}`
      })
    }

    return { sql: formattedSql, values }
  }
}