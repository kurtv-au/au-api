import { eventHandler, getQuery, readBody, createError } from 'h3'
import { query } from '../../utils/database'
import type { User, DatabaseResponse } from '../../types/database'

/**
 * GET /api/users
 * Get all users with optional pagination
 */
export default eventHandler(async (event) => {
  const method = event.method

  try {
    // GET - List users
    if (method === 'GET') {
      const queryParams = getQuery(event)
      const page = parseInt(queryParams.page as string) || 1
      const limit = parseInt(queryParams.limit as string) || 10
      const offset = (page - 1) * limit

      // Get paginated users
      const result = await query<User>(`
        SELECT * FROM Users
        ORDER BY created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `, {
        offset,
        limit
      })

      // Get total count
      const countResult = await query<{ total: number }>(`
        SELECT COUNT(*) as total FROM Users
      `)

      const response: DatabaseResponse<User[]> = {
        success: true,
        data: result.recordset,
        count: countResult.recordset[0]?.total || 0
      }

      return response
    }

    // POST - Create user
    if (method === 'POST') {
      const body = await readBody(event)
      
      if (!body.email || !body.name) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Email and name are required'
        })
      }

      const result = await query<User>(`
        INSERT INTO Users (email, name, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@email, @name, GETDATE(), GETDATE())
      `, {
        email: body.email,
        name: body.name
      })

      const response: DatabaseResponse<User> = {
        success: true,
        data: result.recordset[0]
      }

      return response
    }

    // Method not allowed
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })

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