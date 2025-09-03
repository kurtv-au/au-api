/**
 * Test script to demonstrate case mapping functionality
 * This shows how database PascalCase fields are transformed to camelCase for API responses
 */

// Simple inline case mapper for testing (mimics the TypeScript utility)
function toCamelCase(str) {
  if (!str || str.length === 0) return str
  return str.charAt(0).toLowerCase() + str.slice(1)
}

const DB_TO_API_FIELD_MAP = {
  // Client Info fields
  'Stamp': 'stamp',
  'OrderId': 'orderId', 
  'Index': 'index',
  'Info': 'info',
  'ClientNumber': 'clientNumber',
  'ClientName': 'clientName',
  'ProcessedInfo': 'processedInfo',
  'fieldProcessing': 'fieldProcessing',
  
  // Keep existing camelCase fields as-is
  'infoId': 'infoId',
  'cltId': 'cltId'
}

function transformObjectKeys(obj) {
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
  
  const transformed = {}
  
  for (const [key, value] of Object.entries(obj)) {
    // Use explicit mapping if available, otherwise convert to camelCase
    const newKey = DB_TO_API_FIELD_MAP[key] || toCamelCase(key)
    
    // Recursively transform nested objects
    transformed[newKey] = transformObjectKeys(value)
  }
  
  return transformed
}

function transformRecordset(recordset) {
  if (!Array.isArray(recordset)) {
    return []
  }
  
  return recordset.map(result => transformObjectKeys(result))
}

console.log('Testing Case Mapping Utility')
console.log('=============================')

// Mock database result (PascalCase as it comes from SQL Server)
const mockDatabaseResult = {
  infoId: 123,
  Stamp: new Date('2024-09-03T12:00:00Z'),
  cltId: 456,
  OrderId: 1,
  Index: 'Main Office',
  Info: '<span amtelco_nxt_field="CFld.Phone.17">[CFld.Phone.17]</span>',
  ClientNumber: 12345,
  ClientName: 'Answer United',
  ProcessedInfo: '<span amtelco_nxt_field="CFld.Phone.17">(555) 123-4567</span>',
  fieldProcessing: {
    totalFields: 1,
    replacedFields: 1,
    missingFields: []
  }
}

console.log('\n1. Original Database Result (Mixed Case):')
console.log('==========================================')
Object.entries(mockDatabaseResult).forEach(([key, value]) => {
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    console.log(`  ${key}: ${JSON.stringify(value)}`)
  } else {
    console.log(`  ${key}: ${value}`)
  }
})

// Transform to API format
const apiResult = transformObjectKeys(mockDatabaseResult)

console.log('\n2. Transformed API Result (camelCase):')
console.log('=====================================')
Object.entries(apiResult).forEach(([key, value]) => {
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    console.log(`  ${key}: ${JSON.stringify(value)}`)
  } else {
    console.log(`  ${key}: ${value}`)
  }
})

// Test array transformation (typical recordset)
const mockRecordset = [
  {
    infoId: 123,
    Stamp: new Date('2024-09-03T12:00:00Z'),
    cltId: 456,
    OrderId: 1,
    Index: 'Main Office',
    Info: '<p>Main office info</p>',
    ClientNumber: 12345,
    ClientName: 'Answer United'
  },
  {
    infoId: 124,
    Stamp: new Date('2024-09-03T13:00:00Z'),
    cltId: 456,
    OrderId: 2,
    Index: 'Branch Office',
    Info: '<p>Branch office info</p>',
    ClientNumber: 12345,
    ClientName: 'Answer United'
  }
]

console.log('\n3. Transforming Array of Records:')
console.log('=================================')
console.log('Original recordset (first item):')
Object.entries(mockRecordset[0]).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`)
})

const transformedRecordset = transformRecordset(mockRecordset)

console.log('\nTransformed recordset (first item):')
Object.entries(transformedRecordset[0]).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`)
})

console.log('\n4. Final API Response Example:')
console.log('==============================')
const exampleApiResponse = {
  success: true,
  data: transformedRecordset,
  count: transformedRecordset.length,
  fieldSummary: {
    totalFields: 2,
    replacedFields: 2,
    missingFields: [],
    processedRecords: 2
  }
}

console.log(JSON.stringify(exampleApiResponse, null, 2))

console.log('\n5. Case Consistency Analysis:')
console.log('=============================')
const allKeys = []
const collectKeys = (obj, prefix = '') => {
  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    allKeys.push(fullKey)
    if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date) && !Array.isArray(obj[key])) {
      collectKeys(obj[key], fullKey)
    } else if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
      collectKeys(obj[key][0], `${fullKey}[0]`)
    }
  })
}

collectKeys(exampleApiResponse)

const isCamelCase = (str) => {
  const key = str.split('.').pop().split('[')[0] // Get the actual key name
  return /^[a-z][a-zA-Z0-9]*$/.test(key) || key === 'success' || key === 'data' || key === 'count'
}

const camelCaseKeys = allKeys.filter(isCamelCase)
const nonCamelCaseKeys = allKeys.filter(key => !isCamelCase(key))

console.log(`✅ camelCase keys (${camelCaseKeys.length}):`)
camelCaseKeys.forEach(key => console.log(`  - ${key}`))

if (nonCamelCaseKeys.length > 0) {
  console.log(`❌ Non-camelCase keys (${nonCamelCaseKeys.length}):`)
  nonCamelCaseKeys.forEach(key => console.log(`  - ${key}`))
} else {
  console.log('🎉 All keys are consistently camelCase!')
}

console.log('\nTest completed!')