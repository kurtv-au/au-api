import { eventHandler, getQuery } from 'h3'
import { query } from '~/utils/database'
import { transformRecordset } from '~/utils/caseMapper'
import type { DatabaseResponse, ClientListItem } from '~/types/database'

export default eventHandler(async (event) => {
  const params = getQuery(event)
  
  // Build dynamic WHERE clause based on provided filters
  const conditions: string[] = []
  const queryParams: Record<string, any> = {}
  
  // Check for ClientNumber filter
  if (params.clientNumber) {
    conditions.push('ClientNumber = @clientNumber')
    queryParams.clientNumber = parseFloat(params.clientNumber as string)
  }
  
  // Check for ClientName filter (partial match)
  if (params.clientName) {
    conditions.push('ClientName LIKE @clientName')
    queryParams.clientName = `%${params.clientName}%`
  }
  
  // Check for BillingCode filter (partial match)
  if (params.billingCode) {
    conditions.push('BillingCode LIKE @billingCode')
    queryParams.billingCode = `%${params.billingCode}%`
  }
  
  // Build the SQL query
  let sql = `
    SELECT 
      cltId,
      Stamp,
      ClientNumber,
      ClientName,
      BillingCode
    FROM dbo.cltClients
  `
  
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }
  
  sql += ' ORDER BY ClientName'
  
  try {
    const result = await query<ClientListItem>(sql, queryParams)
    const transformedData = transformRecordset(result.recordset)
    
    const response: DatabaseResponse<ClientListItem> = {
      success: true,
      data: transformedData,
      count: transformedData.length
    }
    
    return response
  } catch (error: any) {
    console.error('Error fetching client list:', error)
    
    const response: DatabaseResponse<ClientListItem> = {
      success: false,
      error: error.message || 'Failed to fetch client list',
      data: []
    }
    
    return response
  }
})