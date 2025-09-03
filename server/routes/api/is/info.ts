import { eventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { query } from '../../../utils/database'
import type { ClientInfoWithDetails, DatabaseResponse } from '../../../types/database'

/**
 * Query parameters schema with XOR validation
 * Either clientNumber OR clientName must be provided (not both, not neither)
 */
const querySchema = z.object({
  clientNumber: z.string().optional(),
  clientName: z.string().optional()
}).refine((data) => {
  // XOR: exactly one must be provided
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

    const { clientNumber, clientName } = validation.data
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

    // Return successful response
    const response: DatabaseResponse<ClientInfoWithDetails[]> = {
      success: true,
      data: result!.recordset,
      count: result!.recordset.length
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