import { eventHandler, getQuery, createError } from 'h3'
import { DatabaseManager } from '~/utils/databases'
import { transformRecordset } from '~/utils/caseMapper'
import type { DatabaseResponse, CallItem } from '~/types/database'

// Initialize database manager
DatabaseManager.loadFromEnvironment()
const db = DatabaseManager.getInstance()

export default eventHandler(async (event) => {
  const params = getQuery(event)

  // Validate date parameters before processing
  if (params.startDate) {
    const startDate = new Date(params.startDate as string)
    if (isNaN(startDate.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid startDate format: '${params.startDate}'. Use formats like '2025-09-21' or '2025-09-21T10:30:00Z'`
      })
    }
  }

  if (params.endDate) {
    const endDate = new Date(params.endDate as string)
    if (isNaN(endDate.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid endDate format: '${params.endDate}'. Use formats like '2025-09-21' or '2025-09-21T10:30:00Z'`
      })
    }
  }

  // Validate date range logic
  if (params.startDate && params.endDate) {
    const startDate = new Date(params.startDate as string)
    const endDate = new Date(params.endDate as string)
    if (startDate > endDate) {
      throw createError({
        statusCode: 400,
        statusMessage: `startDate (${params.startDate}) cannot be after endDate (${params.endDate})`
      })
    }
  }

  // Build dynamic WHERE clause based on provided filters
  const conditions: string[] = []
  const queryParams: Record<string, any> = {}

  // Check for CallNumber filter (exact match)
  if (params.callNumber) {
    conditions.push('CallNumber = @callNumber')
    queryParams.callNumber = params.callNumber as string
  }

  // Check for ClientName filter (partial match)
  if (params.clientName) {
    conditions.push('ClientName LIKE @clientName')
    queryParams.clientName = `%${params.clientName}%`
  }

  // Check for CallerName filter (partial match)
  if (params.callerName) {
    conditions.push('CallerName LIKE @callerName')
    queryParams.callerName = `%${params.callerName}%`
  }

  // Check for AgentInitials filter (exact match)
  if (params.agentInitials) {
    conditions.push('AgentInitials = @agentInitials')
    queryParams.agentInitials = params.agentInitials as string
  }

  // Check for StationNumber filter (exact match)
  if (params.stationNumber) {
    conditions.push('StationNumber = @stationNumber')
    queryParams.stationNumber = params.stationNumber as string
  }

  // Check for ClientNumber filter (exact match)
  if (params.clientNumber) {
    conditions.push('ClientNumber = @clientNumber')
    queryParams.clientNumber = params.clientNumber as string
  }

  // Check for date range filters
  if (params.startDate) {
    conditions.push('CallTime >= @startDate')
    queryParams.startDate = new Date(params.startDate as string)
  }

  if (params.endDate) {
    conditions.push('CallTime <= @endDate')
    queryParams.endDate = new Date(params.endDate as string)
  }

  // Validate and set pagination parameters
  let limit = 100 // Default limit
  let offset = 0   // Default offset

  if (params.limit) {
    const parsedLimit = parseInt(params.limit as string)
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid limit parameter: '${params.limit}'. Must be a positive integer between 1 and 5000`
      })
    }
    if (parsedLimit > 5000) {
      throw createError({
        statusCode: 400,
        statusMessage: `Limit parameter too large: ${parsedLimit}. Maximum allowed is 5000`
      })
    }
    limit = parsedLimit
  }

  if (params.offset) {
    const parsedOffset = parseInt(params.offset as string)
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid offset parameter: '${params.offset}'. Must be a non-negative integer`
      })
    }
    offset = parsedOffset
  }

  // Build the SQL query with proper pagination
  let sql = `
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
  `

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`
  }

  sql += ' ORDER BY RecID DESC'  // Use RecID instead of CallTime for better performance
  sql += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`

  // Add pagination parameters
  queryParams.offset = offset
  queryParams.limit = limit

  try {
    // Get the logger database connection directly
    const loggerDb = await db.get('logger')

    // Query the Calls table directly in the logger database
    const result = await loggerDb.query<CallItem>(sql, queryParams)
    const transformedData = transformRecordset(result.rows)

    // Get total count only when explicitly requested or for small result sets
    let total: number | undefined
    if (params.includeTotal === 'true' || transformedData.length < limit) {
      try {
        let countSql = `SELECT COUNT(*) as total FROM dbo.Calls`
        if (conditions.length > 0) {
          countSql += ` WHERE ${conditions.join(' AND ')}`
        }

        const countParams = { ...queryParams }
        delete countParams.offset
        delete countParams.limit

        const countResult = await loggerDb.query<{total: number}>(countSql, countParams)
        total = countResult.rows[0]?.total || 0
      } catch (countError) {
        console.warn('Count query failed, continuing without total:', countError)
        total = undefined
      }
    }

    const response: DatabaseResponse<CallItem[]> = {
      success: true,
      data: transformedData,
      count: transformedData.length,
      pagination: {
        limit,
        offset,
        total,
        hasMore: total !== undefined ? (offset + transformedData.length < total) : (transformedData.length === limit),
        note: total === undefined ? "Add includeTotal=true parameter to get total count (may be slow)" : undefined
      }
    }

    return response
  } catch (error: any) {
    console.error('Error fetching calls list:', error)

    const response: DatabaseResponse<CallItem[]> = {
      success: false,
      error: error.message || 'Failed to fetch calls list',
      data: []
    }

    return response
  }
})