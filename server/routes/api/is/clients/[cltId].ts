import { eventHandler, getRouterParam, createError } from 'h3'
import { query } from '~/utils/database'
import { transformRecordset } from '~/utils/caseMapper'
import type { DatabaseResponse, ClientListItem } from '~/types/database'

export default eventHandler(async (event) => {
  const cltId = getRouterParam(event, 'cltId')
  
  // Validate cltId parameter
  if (!cltId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Client ID is required'
    })
  }
  
  const cltIdNum = parseInt(cltId)
  if (isNaN(cltIdNum)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Client ID must be a valid number'
    })
  }
  
  const sql = `
    SELECT 
      cltId,
      Stamp,
      ClientNumber,
      ClientName,
      BillingCode
    FROM dbo.cltClients
    WHERE cltId = @cltId
  `
  
  try {
    const result = await query<ClientListItem>(sql, { cltId: cltIdNum })
    const transformedData = transformRecordset(result.recordset)
    
    if (transformedData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found'
      })
    }
    
    const response: DatabaseResponse<ClientListItem> = {
      success: true,
      data: transformedData[0], // Return single object instead of array
      count: 1
    }
    
    return response
  } catch (error: any) {
    // Re-throw if it's already an H3 error (like our 404)
    if (error.statusCode) {
      throw error
    }
    
    console.error('Error fetching client:', error)
    
    const response: DatabaseResponse<ClientListItem> = {
      success: false,
      error: error.message || 'Failed to fetch client',
      data: undefined
    }
    
    return response
  }
})