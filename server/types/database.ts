/**
 * Database type definitions
 */

// Example User type - replace with your actual schema
export interface User {
  id: number
  email: string
  name: string
  created_at: Date
  updated_at: Date
}

// Example Product type - replace with your actual schema
export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  created_at: Date
  updated_at: Date
}

// Generic database response wrapper
export interface DatabaseResponse<T> {
  success: boolean
  data?: T
  error?: string
  count?: number
}

// Pagination parameters
export interface PaginationParams {
  page: number
  limit: number
  sort?: string
  order?: 'ASC' | 'DESC'
}

// Common query filters
export interface QueryFilters {
  search?: string
  startDate?: Date
  endDate?: Date
  [key: string]: any
}

// Client Info types
export interface ClientInfo {
  infoId: number
  Stamp: Date
  cltId: number
  OrderId: number
  Index: string | null  // text field in database
  Info: string | null   // text field containing HTML content
}

export interface Client {
  cltId: number
  ClientNumber: number  // decimal(10) in database
  ClientName: string
}

export interface ClientInfoWithDetails extends ClientInfo {
  ClientNumber: number
  ClientName: string
}