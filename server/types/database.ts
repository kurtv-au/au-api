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

// Pagination info for list responses
export interface PaginationInfo {
  limit: number
  offset: number
  total?: number
  hasMore: boolean
  note?: string
}

// Generic database response wrapper
export interface DatabaseResponse<T> {
  success: boolean
  data?: T
  error?: string
  count?: number
  pagination?: PaginationInfo
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

// Call Item types (camelCase for API consistency)
export interface CallItem {
  recId: number
  callNumber: string | null
  callId: number | null
  callTime: Date | null
  callDuration: number | null
  stationNumber: string | null
  agentOld: string | null
  agentInitials: string | null
  callerId: string | null
  clientName: string | null
  callerName: string | null
  billingNumber: string | null
  clientNumber: string | null
  callProgress: string | null
  archived: boolean | null
  drive: string | null
  combinedDuration: number | null
  emailed: boolean | null
  endingClientNumber: string | null
  qaScore: number | null
  location: string | null
  endingClientName: string | null
  endingBillingNumber: string | null
  finalClientNumber: string | null
  finalClientName: string | null
  finalBillingNumber: string | null
  endTime: Date | null
  agent: string | null
}

// Pagination response for call lists
export interface CallListResponse {
  success: boolean
  data: CallItem[]
  count: number
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}