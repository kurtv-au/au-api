/**
 * Common database interfaces for multi-database support
 */

import { IResult } from 'mssql'
import { FieldPacket } from 'mysql2/promise'
import { PoolClient, QueryResult } from 'pg'

/**
 * Database types supported by the system
 */
export enum DatabaseType {
  MSSQL = 'mssql',
  MySQL = 'mysql',
  PostgreSQL = 'postgresql'
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  name: string
  type: DatabaseType
  enabled?: boolean
  poolConfig?: PoolConfig
}

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  min?: number
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
  acquireTimeoutMillis?: number
}

/**
 * MSSQL specific configuration
 */
export interface MSSQLConfig extends DatabaseConfig {
  type: DatabaseType.MSSQL
  server: string
  port: number
  database: string
  user: string
  password: string
  encrypt?: boolean
  trustServerCertificate?: boolean
  options?: {
    enableArithAbort?: boolean
    [key: string]: any
  }
}

/**
 * MySQL specific configuration
 */
export interface MySQLConfig extends DatabaseConfig {
  type: DatabaseType.MySQL
  host: string
  port: number
  database: string
  user: string
  password: string
  waitForConnections?: boolean
  queueLimit?: number
  enableKeepAlive?: boolean
  keepAliveInitialDelay?: number
}

/**
 * PostgreSQL specific configuration
 */
export interface PostgreSQLConfig extends DatabaseConfig {
  type: DatabaseType.PostgreSQL
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean | object
  statement_timeout?: number
  query_timeout?: number
}

/**
 * Union type for all database configurations
 */
export type AnyDatabaseConfig = MSSQLConfig | MySQLConfig | PostgreSQLConfig

/**
 * Generic query result that works across all databases
 */
export interface QueryResult<T = any> {
  rows: T[]
  rowCount: number
  fields?: any[]
}

/**
 * Transaction interface
 */
export interface Transaction {
  query<T = any>(sql: string, params?: any): Promise<QueryResult<T>>
  commit(): Promise<void>
  rollback(): Promise<void>
}

/**
 * Common database connection interface
 */
export interface IDatabase {
  /**
   * Database name/identifier
   */
  readonly name: string

  /**
   * Database type
   */
  readonly type: DatabaseType

  /**
   * Connect to the database
   */
  connect(): Promise<void>

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>

  /**
   * Execute a query with optional parameters
   */
  query<T = any>(sql: string, params?: any): Promise<QueryResult<T>>

  /**
   * Execute a stored procedure (where supported)
   */
  execute?<T = any>(procedure: string, params?: any): Promise<QueryResult<T>>

  /**
   * Begin a transaction
   */
  beginTransaction?(): Promise<Transaction>

  /**
   * Test the connection
   */
  testConnection(): Promise<boolean>

  /**
   * Get connection statistics
   */
  getStats?(): ConnectionStats
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  active: number
  idle: number
  total: number
  waiting?: number
  errors?: number
}

/**
 * Database connection event types
 */
export interface DatabaseEvents {
  connect: () => void
  disconnect: () => void
  error: (error: Error) => void
  query: (sql: string, duration: number) => void
}

/**
 * Result type adapters for different databases
 */
export class ResultAdapter {
  /**
   * Convert MSSQL result to common format
   */
  static fromMSSQL<T>(result: IResult<T>): QueryResult<T> {
    return {
      rows: result.recordset || [],
      rowCount: result.rowsAffected?.[0] || result.recordset?.length || 0,
      fields: undefined
    }
  }

  /**
   * Convert MySQL result to common format
   */
  static fromMySQL<T>(rows: T[], fields?: FieldPacket[]): QueryResult<T> {
    return {
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      fields
    }
  }

  /**
   * Convert PostgreSQL result to common format
   */
  static fromPostgreSQL<T>(result: QueryResult<T>): QueryResult<T> {
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
      fields: result.fields
    }
  }
}

/**
 * Database error with additional context
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly database: string,
    public readonly type: DatabaseType,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}