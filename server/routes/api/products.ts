import { eventHandler, getRouterParam, getQuery } from 'h3'
import { query, execute } from '../../utils/database'
import type { Product, DatabaseResponse } from '../../types/database'

/**
 * GET /api/products
 * GET /api/products/:id
 * Example routes showing different query patterns
 */
export default eventHandler(async (event) => {
  try {
    // Check if we're getting a specific product by ID
    const id = getRouterParam(event, 'id')
    
    if (id) {
      // Get single product by ID
      const result = await query<Product>(`
        SELECT * FROM Products
        WHERE id = @id
      `, {
        id: parseInt(id)
      })

      if (result.recordset.length === 0) {
        const response: DatabaseResponse<null> = {
          success: false,
          error: 'Product not found'
        }
        event.context.response = { statusCode: 404 }
        return response
      }

      const response: DatabaseResponse<Product> = {
        success: true,
        data: result.recordset[0]
      }
      return response
    }

    // Get query parameters for filtering
    const queryParams = getQuery(event)
    const search = queryParams.search as string || ''
    const minPrice = parseFloat(queryParams.minPrice as string) || 0
    const maxPrice = parseFloat(queryParams.maxPrice as string) || 999999

    // Example of a more complex query with filters
    const result = await query<Product>(`
      SELECT 
        p.*,
        CASE 
          WHEN p.stock > 0 THEN 'In Stock'
          ELSE 'Out of Stock'
        END as availability
      FROM Products p
      WHERE 
        (@search = '' OR p.name LIKE '%' + @search + '%' OR p.description LIKE '%' + @search + '%')
        AND p.price BETWEEN @minPrice AND @maxPrice
      ORDER BY p.created_at DESC
    `, {
      search,
      minPrice,
      maxPrice
    })

    const response: DatabaseResponse<Product[]> = {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    }

    return response

  } catch (error: any) {
    console.error('Database error:', error)
    
    const response: DatabaseResponse<any> = {
      success: false,
      error: error.message || 'Database operation failed'
    }

    event.context.response = {
      statusCode: error.statusCode || 500
    }

    return response
  }
})