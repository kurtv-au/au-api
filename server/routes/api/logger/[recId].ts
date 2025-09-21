import { eventHandler, getRouterParam, createError } from 'h3'
import { DatabaseManager } from '~/utils/databases'
import { transformRecordset } from '~/utils/caseMapper'
import type { DatabaseResponse, CallItem } from '~/types/database'

// Initialize database manager
DatabaseManager.loadFromEnvironment()
const db = DatabaseManager.getInstance()

export default eventHandler(async (event) => {
  const recId = getRouterParam(event, 'recId')

  // Validate recId parameter
  if (!recId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Record ID is required'
    })
  }

  const recIdNum = parseInt(recId)
  if (isNaN(recIdNum)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Record ID must be a valid number'
    })
  }

  const sql = `
    SELECT
      RecID,
      CallNumber,
      CallID,
      CallTime,
      CallDuration,
      StationNumber,
      Agent_old,
      AgentInitials,
      CallerID,
      ClientName,
      CallerName,
      BillingNumber,
      ClientNumber,
      CallProgress,
      Archived,
      Drive,
      CombinedDuration,
      Emailed,
      EndingClientNumber,
      QAScore,
      Location,
      EndingClientName,
      EndingBillingNumber,
      FinalClientNumber,
      FinalClientName,
      FinalBillingNumber,
      EndTime,
      Agent
    FROM dbo.Calls
    WHERE RecID = @recId
  `

  try {
    // Get the logger database connection directly
    const loggerDb = await db.get('logger')
    const result = await loggerDb.query<CallItem>(sql, { recId: recIdNum })
    const transformedData = transformRecordset(result.rows)

    if (transformedData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Call not found'
      })
    }

    const response: DatabaseResponse<CallItem> = {
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

    console.error('Error fetching call:', error)

    const response: DatabaseResponse<CallItem> = {
      success: false,
      error: error.message || 'Failed to fetch call',
      data: undefined
    }

    return response
  }
})