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
This API features a comprehensive multi-database architecture supporting multiple database types and connections:

**Supported Database Systems:**
- **MSSQL**: Multiple SQL Server databases on same or different servers
- **MySQL**: Full MySQL support with connection pooling
- **PostgreSQL**: Complete PostgreSQL implementation

**Named Database Connections:**
- `intelligent` (MSSQL) - Main system database
- `unity-logger` (MSSQL) - Logging and event tracking
- `mdr` (MSSQL) - MDR system (future)
- `absentee` (MySQL) - Absentee management
- `engage` (PostgreSQL) - Engagement system (future)
- `default` (MSSQL) - Legacy backward compatibility
- `mysql` (MySQL) - Legacy backward compatibility

### Configuration
Set up database connections via environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials

# SQL Server Configuration
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=your_mysql_database
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
```

### SQL Server Utilities (`server/utils/database.ts`)
- **getPool()**: Returns singleton connection pool
- **query()**: Execute parameterized SQL queries with named parameters
- **execute()**: Execute stored procedures
- **closePool()**: Clean up connections

### MySQL Utilities (`server/utils/mysqlDatabase.ts`)
- **getMySQLPool()**: Returns singleton MySQL connection pool
- **mysqlQuery()**: Execute MySQL queries with positional parameters
- **mysqlQueryNamed()**: Execute MySQL queries with named parameters
- **mysqlExecute()**: Execute MySQL stored procedures
- **getMySQLConnection()**: Get connection for transactions
- **closeMySQLPool()**: Clean up MySQL connections
- **testMySQLConnection()**: Verify MySQL connectivity

### Database Manager Usage

#### Getting Database Connections
```typescript
import { db } from '~/utils/databases'

// Get specific named database
const intelligentDb = await db.get('intelligent')
const loggerDb = await db.get('unity-logger')
const absenteeDb = await db.get('absentee')

// Check if database is registered
if (db.has('mdr')) {
  const mdrDb = await db.get('mdr')
}

// Test all connections
const healthResults = await db.testAllConnections()
```

### Usage Examples

#### SQL Server Query (Legacy)
```typescript
import { query } from '~/server/utils/database'

const result = await query<User>('SELECT * FROM Users WHERE id = @id', { id: 1 })
```

#### MySQL Query (Positional Parameters)
```typescript
import { mysqlQuery } from '~/server/utils/mysqlDatabase'

const result = await mysqlQuery<User>('SELECT * FROM users WHERE id = ?', [1])
const users = result.rows
```

#### MySQL Query (Named Parameters)
```typescript
import { mysqlQueryNamed } from '~/server/utils/mysqlDatabase'

const result = await mysqlQueryNamed<User>(
  'SELECT * FROM users WHERE id = :id AND status = :status',
  { id: 1, status: 'active' }
)
const users = result.rows
```

#### Using Multiple Named Databases in One Endpoint
```typescript
import { eventHandler } from 'h3'
import { db } from '~/utils/databases'

export default eventHandler(async (event) => {
  try {
    // Get multiple database connections
    const intelligentDb = await db.get('intelligent')
    const loggerDb = await db.get('unity-logger')
    const absenteeDb = await db.get('absentee')

    // Query each database
    const clients = await intelligentDb.query('SELECT * FROM clients')
    const logs = await loggerDb.query('SELECT * FROM logs WHERE date = @date', { date: new Date() })
    const absences = await absenteeDb.query('SELECT * FROM absences WHERE status = ?', ['pending'])

    return {
      success: true,
      data: {
        clients: clients.rows,
        logs: logs.rows,
        absences: absences.rows
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

#### API Route with Both Databases (Legacy)
```typescript
import { eventHandler } from 'h3'
import { query } from '~/server/utils/database'
import { mysqlQuery } from '~/server/utils/mysqlDatabase'

export default eventHandler(async (event) => {
  try {
    // Get data from SQL Server
    const sqlServerResult = await query('SELECT * FROM Products')

    // Get data from MySQL
    const mysqlResult = await mysqlQuery('SELECT * FROM inventory')

    return {
      success: true,
      sqlServer: sqlServerResult.recordset,
      mysql: mysqlResult.rows
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

#### MySQL Transactions
```typescript
import { getMySQLConnection } from '~/server/utils/mysqlDatabase'

const connection = await getMySQLConnection()
try {
  await connection.beginTransaction()

  await connection.execute('INSERT INTO orders ...', [values])
  await connection.execute('UPDATE inventory ...', [values])

  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
}
```

### Database Types
Database models are defined in `server/types/database.ts` using consistent camelCase naming:
- All API responses use camelCase field names (e.g., `clientNumber`, `clientName`, `orderId`)
- Database fields are automatically transformed from PascalCase to camelCase using the case mapping utility
- The DatabaseResponse<T> wrapper provides a consistent API response format
- MySQL results follow the same camelCase convention for API consistency

### Health Check Endpoints
- `/api/health` - Legacy SQL Server health check
- `/api/mysql-health` - Legacy MySQL health check
- `/api/health/all` - Aggregate health check for all databases
- `/api/health/[database]` - Individual database health check
  - Examples: `/api/health/intelligent`, `/api/health/unity-logger`, `/api/health/absentee`

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
- **Automatic**: Applied to all `/api/*` routes except `/api/health`, `/api/mysql-health`, and `/api/version`
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
SQL Server connectivity and system health status.

#### `/api/mysql-health`
MySQL connectivity and health status.

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
Resolves field values from database with performance optimization:
- **resolveClientFields()**: Process single client record
- **resolveMultipleClientFields()**: Process multiple client records
- **batchGetFieldValues()**: Batch database queries for performance
- Trims all field values and handles missing fields gracefully