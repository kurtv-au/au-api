import { eventHandler } from 'h3'
import { getVersionInfo } from '../../utils/version'

/**
 * GET /api/version
 * Returns version information including package version and build timestamp
 * This endpoint does not require authentication for easier monitoring
 */
export default eventHandler(async (event) => {
  try {
    return getVersionInfo()
  } catch (error: any) {
    console.error('Error getting version info:', error)
    
    // Return minimal version info on error
    return {
      name: 'au-api',
      version: 'unknown',
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      error: 'Failed to retrieve complete version information'
    }
  }
})