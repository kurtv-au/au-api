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

// Client Info types (camelCase for API consistency)
export interface ClientInfo {
  infoId: number
  stamp: Date
  cltId: number
  orderId: number
  index: string | null  // text field in database
  info: string | null   // text field containing HTML content
}

export interface Client {
  cltId: number
  clientNumber: number  // decimal(10) in database
  clientName: string
}

// Client List type for IS clients endpoint (camelCase for API consistency)
export interface ClientListItem {
  cltId: number
  stamp: Date
  clientNumber: number
  clientName: string
  billingCode: string
}

export interface ClientInfoWithDetails extends ClientInfo {
  clientNumber: number
  clientName: string
}

// Directory Listing Field types (camelCase for API consistency)
export interface DirListingField {
  id: number
  listId: number | null
  subfieldId: number | null
  subId: number | null
  cltfieldID: number | null
  cltID: number | null
  field: string
  dataType: number
  imageId: number | null
  contactEmailId: number | null
  contactPhoneId: number | null
  contactTapPagerId: number | null
  contactSmsId: number | null
  searchField: string | null
  contactSecureMessagingId: number | null
  contactSnppId: number | null
  contactWctpId: number | null
  contactFaxId: number | null
  contactVoceraId: number | null
  contactCiscoId: number | null
  url: string | null
}

// Field processing types (camelCase for API consistency)
export interface ProcessedClientInfo extends ClientInfoWithDetails {
  processedInfo?: string  // HTML with replaced field values
  fieldProcessing?: FieldProcessingResult  // Metadata about field processing
}

export interface FieldProcessingResult {
  totalFields: number
  replacedFields: number
  missingFields: string[]
}