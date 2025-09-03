import { createError } from 'h3'

/**
 * Authentication utilities
 */

/**
 * Validates an API key against the configured key
 * @param apiKey The API key to validate
 * @returns boolean indicating if the key is valid
 */
export function validateApiKey(apiKey: string | undefined): boolean {
  const expectedApiKey = process.env.API_KEY
  
  if (!expectedApiKey) {
    throw new Error('API_KEY environment variable is not configured')
  }
  
  return apiKey === expectedApiKey
}

/**
 * Generates a random API key for development/testing
 * @param length Length of the generated key (default: 32)
 * @returns A random hex string
 */
export function generateApiKey(length: number = 32): string {
  const characters = '0123456789abcdef'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  
  return result
}

/**
 * Creates a standardized authentication error
 * @param message Optional custom error message
 * @returns H3 error object
 */
export function createAuthError(message: string = 'Authentication required') {
  return createError({
    statusCode: 401,
    statusMessage: message
  })
}

/**
 * Checks if the current environment requires authentication
 * Useful for testing or development scenarios
 * @returns boolean indicating if auth is required
 */
export function isAuthRequired(): boolean {
  // Skip auth in test environment
  if (process.env.NODE_ENV === 'test') {
    return false
  }
  
  // Require auth if API_KEY is configured
  return !!process.env.API_KEY
}