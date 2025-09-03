import { eventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { query } from '../../../utils/database'
import { resolveMultipleClientFields } from '../../../utils/fieldResolver'
import { transformRecordset } from '../../../utils/caseMapper'
import type { ClientInfoWithDetails, ProcessedClientInfo, DatabaseResponse, FieldProcessingResult } from '../../../types/database'

/**
 * Query parameters schema with XOR validation
 * Either clientNumber OR clientName must be provided (not both, not neither)
 */
const querySchema = z.object({
  clientNumber: z.string().optional(),
  clientName: z.string().optional(),
  processFields: z.string().optional().transform(val => val === 'true')
}).refine((data) => {
  // XOR: exactly one must be provided (clientNumber OR clientName)
  return (!!data.clientNumber) !== (!!data.clientName)
}, {
  message: 'Either clientNumber or clientName must be provided (not both)'
})

/**
 * GET /api/is/info
 * Get all cltInfo rows for a specific ClientNumber or ClientName (partial match)
 */
export default eventHandler(async (event) => {
  const method = event.method

  try {
    // Only handle GET requests
    if (method !== 'GET') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // Get and validate query parameters
    const queryParams = getQuery(event)
    const validation = querySchema.safeParse(queryParams)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: validation.error.issues[0]?.message || 'Invalid query parameters'
      })
    }

    const { clientNumber, clientName, processFields } = validation.data
    let result

    if (clientNumber) {
      // Search by ClientNumber (exact match)
      const clientNumberValue = parseFloat(clientNumber)
      if (isNaN(clientNumberValue)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'ClientNumber must be a valid number'
        })
      }

      result = await query<ClientInfoWithDetails>(`
        SELECT ci.*, cc.ClientName, cc.ClientNumber
        FROM dbo.cltInfo ci
        INNER JOIN dbo.cltClients cc ON ci.cltId = cc.cltId
        WHERE cc.ClientNumber = @ClientNumber
        ORDER BY ci.OrderId
      `, {
        ClientNumber: clientNumberValue
      })
    } else if (clientName) {
      // Search by ClientName (partial match using LIKE)
      result = await query<ClientInfoWithDetails>(`
        SELECT ci.*, cc.ClientName, cc.ClientNumber
        FROM dbo.cltInfo ci
        INNER JOIN dbo.cltClients cc ON ci.cltId = cc.cltId
        WHERE cc.ClientName LIKE @ClientName
        ORDER BY cc.ClientName, ci.OrderId
      `, {
        ClientName: `%${clientName}%`
      })
    }

    // Transform database results to camelCase for API consistency
    let responseData = transformRecordset<ClientInfoWithDetails>(result!.recordset)

    // Process fields if requested
    if (processFields && responseData.length > 0) {
      try {
        const processedResults = await resolveMultipleClientFields(responseData)
        
        // Transform results to include processedInfo (note: camelCase)
        responseData = processedResults.map((item, index) => ({
          ...responseData[index],
          processedInfo: item.processedInfo,
          fieldProcessing: item.fieldProcessing
        })) as ProcessedClientInfo[]
        
      } catch (fieldError: any) {
        console.error('Field processing error:', fieldError)
        // Continue without field processing if it fails
        console.warn('Continuing without field processing due to error')
      }
    }

    // Prepare response with field processing metadata if applicable
    const response: DatabaseResponse<ClientInfoWithDetails[] | ProcessedClientInfo[]> = {
      success: true,
      data: responseData,
      count: responseData.length
    }

    // Add field processing summary if fields were processed
    if (processFields && responseData.length > 0) {
      const processedData = responseData as ProcessedClientInfo[]
      const totalFields = processedData.reduce((sum, item) => sum + (item.fieldProcessing?.totalFields || 0), 0)
      const replacedFields = processedData.reduce((sum, item) => sum + (item.fieldProcessing?.replacedFields || 0), 0)
      const allMissingFields = processedData.flatMap(item => item.fieldProcessing?.missingFields || [])
      
      ;(response as any).fieldSummary = {
        totalFields,
        replacedFields,
        missingFields: [...new Set(allMissingFields)], // Remove duplicates
        processedRecords: processedData.filter(item => item.fieldProcessing?.totalFields || 0 > 0).length
      }
    }

    return response

  } catch (error: any) {
    console.error('Database error:', error)
    
    // Return error response
    const response: DatabaseResponse<any> = {
      success: false,
      error: error.message || 'Database operation failed'
    }

    // Set appropriate status code
    event.context.response = {
      statusCode: error.statusCode || 500
    }

    return response
  }
})