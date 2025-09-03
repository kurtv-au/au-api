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

### Configuration
Set up database connection via environment variables:
```bash
cp .env.example .env
# Edit .env with your SQL Server credentials
```

### Database Utilities (`server/utils/database.ts`)
- **getPool()**: Returns singleton connection pool
- **query()**: Execute parameterized SQL queries
- **execute()**: Execute stored procedures
- **closePool()**: Clean up connections

### Usage Examples

#### Simple Query
```typescript
import { query } from '~/server/utils/database'

const result = await query<User>('SELECT * FROM Users WHERE id = @id', { id: 1 })
```

#### API Route with Error Handling
```typescript
import { eventHandler } from 'h3'
import { query } from '~/server/utils/database'

export default eventHandler(async (event) => {
  try {
    const result = await query('SELECT * FROM Products')
    return { success: true, data: result.recordset }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

### Database Types
Define your database models in `server/types/database.ts`. The DatabaseResponse<T> wrapper provides a consistent API response format.

### Health Check
The `/api/health` endpoint verifies database connectivity and can be used for monitoring.

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
- **Automatic**: Applied to all `/api/*` routes except `/api/health` and `/api/version`
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

## Public Endpoints (No Authentication)

### `/api/health`
Database connectivity and system health status.

### `/api/version`
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