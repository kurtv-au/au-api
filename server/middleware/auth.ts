import { defineEventHandler, getRequestHeader, getRequestURL, createError } from 'h3'

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header for all /api routes except /api/health and /api/version
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  
  // Only apply authentication to /api routes
  if (!url.pathname.startsWith('/api')) {
    return
  }
  
  // Skip authentication for monitoring endpoints
  if (url.pathname === '/api/health' ||
      url.pathname.startsWith('/api/health/') ||
      url.pathname === '/api/version') {
    return
  }
  
  // Get API key from header
  const apiKey = getRequestHeader(event, 'x-api-key')
  const expectedApiKey = process.env.API_KEY
  
  // Check if API key is configured
  if (!expectedApiKey) {
    console.error('API_KEY environment variable is not configured')
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }
  
  // Validate API key
  if (!apiKey) {
    throw createError({
      statusCode: 401,
      statusMessage: 'API key required. Include X-API-Key header.'
    })
  }
  
  if (apiKey !== expectedApiKey) {
    console.warn(`Invalid API key attempt from ${event.node.req.socket.remoteAddress}: ${apiKey}`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid API key'
    })
  }
  
  // API key is valid, request can proceed
  // Optionally store validation info in context for route handlers
  event.context.authenticated = true
})