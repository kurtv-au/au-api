import packageJson from '../../package.json'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Version utilities for the API
 */

interface VersionInfo {
  name: string
  version: string
  description: string
  author: string
  buildDate: string
  timestamp: string
  nodeVersion: string
  environment: string
}

/**
 * Get build timestamp from build file or fallback to current time
 */
function getBuildTimestamp(): string {
  try {
    // Try to read build timestamp from file (if created during build)
    const buildFilePath = join(process.cwd(), '.build-timestamp')
    if (existsSync(buildFilePath)) {
      const buildTimestamp = readFileSync(buildFilePath, 'utf-8').trim()
      return new Date(buildTimestamp).toISOString()
    }
  } catch (error) {
    // Fallback if file doesn't exist or can't be read
  }

  // Fallback: use current time (for development)
  return new Date().toISOString()
}

/**
 * Get complete version information
 */
export function getVersionInfo(): VersionInfo {
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description || '',
    author: packageJson.author || '',
    buildDate: getBuildTimestamp(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  }
}

/**
 * Get just the version string
 */
export function getVersion(): string {
  return packageJson.version
}

/**
 * Get just the application name
 */
export function getAppName(): string {
  return packageJson.name
}