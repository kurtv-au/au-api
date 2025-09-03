/**
 * Case Mapping Utility
 * Transforms database results from PascalCase to camelCase for API consistency
 */

/**
 * Converts a PascalCase string to camelCase
 */
function toCamelCase(str: string): string {
  if (!str || str.length === 0) return str
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Converts a camelCase string back to PascalCase (for reverse mapping if needed)
 */
function toPascalCase(str: string): string {
  if (!str || str.length === 0) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Database field mapping - maps PascalCase database fields to camelCase API fields
 */
const DB_TO_API_FIELD_MAP = {
  // Client Info fields
  'Stamp': 'stamp',
  'OrderId': 'orderId', 
  'Index': 'index',
  'Info': 'info',
  'ClientNumber': 'clientNumber',
  'ClientName': 'clientName',
  
  // Directory Listing Fields
  'Field': 'field',
  'DataType': 'dataType',
  'Url': 'url',
  
  // Keep existing camelCase fields as-is
  'infoId': 'infoId',
  'cltId': 'cltId',
  'listId': 'listId',
  'subfieldId': 'subfieldId',
  'subId': 'subId',
  'cltfieldID': 'cltfieldID',
  'cltID': 'cltID',
  'imageId': 'imageId',
  'contactEmailId': 'contactEmailId',
  'contactPhoneId': 'contactPhoneId',
  'contactTapPagerId': 'contactTapPagerId',
  'contactSmsId': 'contactSmsId',
  'searchField': 'searchField',
  'contactSecureMessagingId': 'contactSecureMessagingId',
  'contactSnppId': 'contactSnppId',
  'contactWctpId': 'contactWctpId',
  'contactFaxId': 'contactFaxId',
  'contactVoceraId': 'contactVoceraId',
  'contactCiscoId': 'contactCiscoId',
  
  // API-specific fields (ensure camelCase)
  'ProcessedInfo': 'processedInfo',
  'fieldProcessing': 'fieldProcessing'
}

/**
 * Transforms a single object's keys from database case to API case
 */
export function transformObjectKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectKeys(item))
  }
  
  if (obj instanceof Date) {
    return obj
  }
  
  const transformed: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    // Use explicit mapping if available, otherwise convert to camelCase
    const newKey = DB_TO_API_FIELD_MAP[key as keyof typeof DB_TO_API_FIELD_MAP] || toCamelCase(key)
    
    // Recursively transform nested objects
    transformed[newKey] = transformObjectKeys(value)
  }
  
  return transformed
}

/**
 * Transforms an array of database results to API format
 */
export function transformDatabaseResults<T = any>(results: any[]): T[] {
  if (!Array.isArray(results)) {
    return []
  }
  
  return results.map(result => transformObjectKeys(result))
}

/**
 * Transforms a database recordset to API format
 */
export function transformRecordset<T = any>(recordset: any[]): T[] {
  return transformDatabaseResults<T>(recordset)
}

/**
 * Reverse mapping - converts camelCase API fields back to database PascalCase
 * Useful for building SQL queries with user input
 */
const API_TO_DB_FIELD_MAP = Object.fromEntries(
  Object.entries(DB_TO_API_FIELD_MAP).map(([db, api]) => [api, db])
)

/**
 * Maps API field names back to database field names for SQL queries
 */
export function mapApiFieldToDb(apiField: string): string {
  return API_TO_DB_FIELD_MAP[apiField] || toPascalCase(apiField)
}

/**
 * Validates that a field name is a known database field
 */
export function isValidDbField(fieldName: string): boolean {
  return Object.keys(DB_TO_API_FIELD_MAP).includes(fieldName)
}

/**
 * Gets all supported API field names
 */
export function getSupportedApiFields(): string[] {
  return Object.values(DB_TO_API_FIELD_MAP)
}

/**
 * Gets all supported database field names
 */
export function getSupportedDbFields(): string[] {
  return Object.keys(DB_TO_API_FIELD_MAP)
}