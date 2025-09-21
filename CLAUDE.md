# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nitro API application using TypeScript and the h3 framework. Nitro is a powerful server framework for building APIs and full-stack applications.

## Development Commands

```bash
# Start development server (usually on port 3000)
npm run dev

# Build for production
npm run build
```

## Architecture & Structure

### Core Framework
- **Nitro**: Server framework handling routing, middleware, and build processes
- **h3**: Lightweight HTTP framework providing event handlers and utilities
- **TypeScript**: Strict type checking enabled with comprehensive safety settings
- **mssql**: Microsoft SQL Server client using tedious driver for lightweight database connectivity

### Directory Structure
- `server/`: Main application code
  - `routes/api`: API endpoints and route handlers (file-based routing)
  - `middleware/`: Server middleware for authentication and request processing
  - `plugins/`: Nitro plugins for extending functionality
  - `types/`: TypeScript type definitions including database models
  - `utils/`: Shared utility functions including database connection management and authentication
- `.nitro/`: Generated build artifacts and types (auto-generated, do not edit)
- `.output/`: Production build output

### Configuration
- `nitro.config.ts`: Main Nitro configuration
  - Source directory set to `server/`
  - Imports disabled (manual imports required)
- `tsconfig.json`: TypeScript configuration with strict mode and safety checks enabled

### Routing
Routes are file-based in `server/routes/`. Each file exports an event handler that processes requests:
- `index.ts` handles the root route
- Subdirectories create nested routes
- Use h3's `eventHandler` to create route handlers

## Key Development Patterns

### Creating Routes
Routes should export default event handlers from h3:
```typescript
import { eventHandler } from "h3"

export default eventHandler((event) => {
  // Handle request
})
```

### API Development
When building APIs:
- Use h3 utilities for request/response handling
- Place route files in appropriate subdirectories under `server/routes/`
- Shared logic goes in `server/utils/`
- Type definitions in `server/types/`

## Database Integration

### Multi-Database Architecture
This API features a comprehensive multi-database architecture supporting multiple database types and named connections through a unified `DatabaseManager` interface.

**Supported Database Systems:**
- **MSSQL**: Microsoft SQL Server with tedious driver
- **MySQL**: MySQL with mysql2 driver and connection pooling
- **PostgreSQL**: PostgreSQL with pg driver (ready for future use)

**Named Database Connections:**
- `intelligent` (MSSQL) - Main system database
- `unity-logger` (MSSQL) - Logging and event tracking (future)
- `mdr` (MSSQL) - MDR system (future)
- `absentee` (MySQL) - Absentee management (future)
- `engage` (PostgreSQL) - Engagement system (future)
- `default` (MSSQL) - Currently mapped to existing database

### Configuration
Set up database connections via environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials

# Primary Database (MSSQL)
DB_SERVER=172.31.55.30
DB_PORT=1433
DB_DATABASE=Intelligent
DB_USER=your_username
DB_PASSWORD=your_password
DB_ENCRYPT=false

# Intelligent Database (uses existing database)
DB_INTELLIGENT_DATABASE=Intelligent

# Unity Logger Database (future)
DB_LOGGER_SERVER=localhost
DB_LOGGER_PORT=1433
DB_LOGGER_DATABASE=logger
DB_LOGGER_USER=your_username
DB_LOGGER_PASSWORD=your_password

# MySQL Configuration (future)
MYSQL_ABSENTEE_HOST=localhost
MYSQL_ABSENTEE_PORT=3306
MYSQL_ABSENTEE_DATABASE=absentee
MYSQL_ABSENTEE_USER=your_username
MYSQL_ABSENTEE_PASSWORD=your_password

# PostgreSQL Configuration (future)
POSTGRES_ENGAGE_HOST=localhost
POSTGRES_ENGAGE_PORT=5432
POSTGRES_ENGAGE_DATABASE=engage
POSTGRES_ENGAGE_USER=your_username
POSTGRES_ENGAGE_PASSWORD=your_password
```

### Database Manager Usage (`server/utils/databases`)
The database manager provides a unified interface for all database operations:

#### Getting Database Connections
```typescript
import { DatabaseManager } from '~/utils/databases'

// Initialize database manager
DatabaseManager.loadFromEnvironment()
const db = DatabaseManager.getInstance()

// Get specific named database
const intelligentDb = await db.get('default')  // Current main database
const loggerDb = await db.get('unity-logger')  // Future logging database
const absenteeDb = await db.get('absentee')    // Future MySQL database

// Check if database is registered
if (db.has('mdr')) {
  const mdrDb = await db.get('mdr')
}

// Test all connections
const healthResults = await db.testAllConnections()
```

#### Unified Database Interface
All database connections use the same interface regardless of database type:
```typescript
// Works with MSSQL, MySQL, and PostgreSQL
const result = await database.query<User>('SELECT * FROM users WHERE id = @id', { id: 1 })
const users = result.rows  // Always use .rows for results

// Transaction support
const transaction = await database.beginTransaction()
try {
  await transaction.query('INSERT INTO ...', params)
  await transaction.query('UPDATE ...', params)
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

#### Multi-Database Operations
```typescript
import { eventHandler } from 'h3'
import { DatabaseManager } from '~/utils/databases'

DatabaseManager.loadFromEnvironment()
const db = DatabaseManager.getInstance()

export default eventHandler(async (event) => {
  try {
    // Get multiple database connections
    const intelligentDb = await db.get('default')

    // Query main database
    const clients = await intelligentDb.query('SELECT * FROM cltClients')

    // Future: Query other databases when configured
    if (db.has('unity-logger')) {
      const loggerDb = await db.get('unity-logger')
      const logs = await loggerDb.query('SELECT * FROM logs WHERE date = @date', { date: new Date() })
    }

    return {
      success: true,
      data: clients.rows
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

### Database Types
Database models are defined in `server/types/database.ts` using consistent camelCase naming:
- All API responses use camelCase field names (e.g., `clientNumber`, `clientName`, `orderId`)
- Database fields are automatically transformed from PascalCase to camelCase using the case mapping utility
- The DatabaseResponse<T> wrapper provides a consistent API response format
- MySQL results follow the same camelCase convention for API consistency

### Health Check Endpoints
The API provides comprehensive health checking for all database connections:

- `/api/health` - Primary database health check using new database manager
- `/api/health/all` - Aggregate health check for all registered databases
- `/api/health/[database]` - Individual database health check by name
  - Examples: `/api/health/default`, `/api/health/unity-logger`, `/api/health/absentee`

**Health Check Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-21T16:30:09.417Z",
  "database": {
    "connected": true,
    "message": "Database connection successful"
  }
}
```

### Version Information
The `/api/version` endpoint provides application version and build information:
- Package version from package.json
- Build timestamp (set during `npm run build`)
- Node.js version
- Environment information
- No authentication required (public endpoint for monitoring)

## Authentication

### API Key Setup
All API endpoints (except `/api/health` and `/api/version`) require authentication via API key:

1. **Configure API Key**:
   ```bash
   # Set your API key in .env
   API_KEY=your-secret-api-key-here
   ```

2. **Generate API Key** (optional helper):
   ```typescript
   import { generateApiKey } from '~/server/utils/auth'
   const apiKey = generateApiKey(32) // Generates random 32-character hex key
   ```

### Authentication Middleware (`server/middleware/auth.ts`)
- **Automatic**: Applied to all `/api/*` routes except health endpoints and `/api/version`
- **Excluded Endpoints**: `/api/health`, `/api/health/*`, `/api/version`
- **Header Required**: `X-API-Key` header must match configured `API_KEY`
- **Error Handling**: Returns 401 Unauthorized for missing/invalid keys
- **Logging**: Warns about invalid key attempts with IP address

### Making Authenticated Requests

#### Using curl
```bash
curl -H "X-API-Key: your-secret-api-key-here" http://localhost:3000/api/users
```

#### Using JavaScript fetch
```javascript
fetch('/api/users', {
  headers: {
    'X-API-Key': 'your-secret-api-key-here'
  }
})
```

### Authentication Utilities (`server/utils/auth.ts`)
- **validateApiKey()**: Validates API key against environment variable
- **generateApiKey()**: Generates random API keys for development
- **createAuthError()**: Creates standardized 401 error responses
- **isAuthRequired()**: Checks if authentication is required (skips in test env)

### Security Notes
- API keys are stored in environment variables (never in code)
- Invalid attempts are logged with IP addresses
- Health and version endpoints remain unauthenticated for monitoring systems
- Test environment can skip authentication via `NODE_ENV=test`

## API Endpoints

### Public Endpoints (No Authentication)

#### `/api/health`
Primary database connectivity and system health status using the new database manager.

#### `/api/health/all`
Comprehensive health check for all registered databases.

#### `/api/health/[database]`
Individual database health check by name (e.g., `/api/health/default`, `/api/health/unity-logger`).

#### `/api/version`
Application version and build information:
```json
{
  "name": "au-api",
  "version": "0.0.0",
  "description": "Answer United API", 
  "author": "kurtv@answerunited.com",
  "buildDate": "2024-09-02T14:30:15.123Z",
  "timestamp": "2024-09-02T14:35:22.456Z",
  "nodeVersion": "v18.17.0",
  "environment": "development"
}
```

### Authenticated Endpoints

#### `/api/is/info` - Client Information Lookup
Fetches client information from cltInfo table with optional HTML field processing.

**Query Parameters** (XOR validation - exactly one required):
- `clientNumber`: Exact match search by client number
- `clientName`: Partial match search by client name

**Optional Parameters**:
- `processFields=true`: Enable HTML field processing with placeholder replacement

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "infoId": 123,
      "stamp": "2024-09-03T12:00:00Z",
      "cltId": 456,
      "orderId": 1,
      "index": "Main Office", 
      "info": "<p>Office information</p>",
      "clientNumber": 12345,
      "clientName": "Answer United",
      "processedInfo": "<p>Processed content</p>", // Only when processFields=true
      "fieldProcessing": {                         // Only when processFields=true
        "totalFields": 1,
        "replacedFields": 1,
        "missingFields": []
      }
    }
  ],
  "count": 1
}
```

**Usage Examples**:
```bash
# Search by client number
curl -H "X-API-Key: your-key" "http://localhost:3000/api/is/info?clientNumber=12345"

# Search by client name with field processing
curl -H "X-API-Key: your-key" "http://localhost:3000/api/is/info?clientName=Answer&processFields=true"
```

## Utility Functions

### Case Mapping (`server/utils/caseMapper.ts`)
Transforms database PascalCase fields to consistent camelCase for API responses:
- **transformObjectKeys()**: Transform single object keys
- **transformRecordset()**: Transform array of database records
- Handles nested objects and preserves Date objects
- Maps specific database fields (e.g., `ClientNumber` → `clientNumber`)

### HTML Field Processing (`server/utils/htmlFieldParser.ts`)
Parses and processes HTML content with field replacement:
- **extractFields()**: Extract `amtelco_nxt_field` attributes and `[field]` placeholders
- **replaceFields()**: Replace placeholders with database values
- **getFieldIds()**: Get unique field IDs for database lookup
- Includes XSS protection through HTML encoding

### Field Resolution (`server/utils/fieldResolver.ts`)
Resolves field values from database with performance optimization using the new database manager:
- **resolveClientFields()**: Process single client record
- **resolveMultipleClientFields()**: Process multiple client records
- **batchGetFieldValues()**: Batch database queries for performance using unified database interface
- **getFieldUsageStats()**: Analytics for field usage patterns
- Trims all field values and handles missing fields gracefully
- Uses the new `DatabaseManager` for consistent database access