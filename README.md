# AU API

Answer United API built with Nitro and TypeScript.

## Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`.

## Docker Deployment

### Option 1: Docker with External Database

```bash
# Copy and configure environment
cp .env.docker .env.docker.local
# Edit .env.docker.local with your database settings

# Build and run
docker build -t au-api .
docker run -p 3000:3000 --env-file .env.docker.local au-api
```

### Option 2: Docker Compose (includes SQL Server)

```bash
# Configure environment
cp .env.docker .env.docker.local
# Edit .env.docker.local with your settings

# Start complete stack
docker-compose --env-file .env.docker.local up -d

# Or without SQL Server container
docker-compose --env-file .env.docker.local up au-api -d
```

### Option 3: Production Deploy

```bash
# Build for production
docker build -t au-api:latest .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e DB_SERVER=your-server \
  -e DB_DATABASE=your-db \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-password \
  -e API_KEY=your-api-key \
  --name au-api \
  au-api:latest
```

## API Usage

All endpoints require authentication via `X-API-Key` header except `/api/health` and `/api/version`.

### Public Endpoints

- `GET /api/health` - Database connectivity check
- `GET /api/version` - Application version info

### Authenticated Endpoints

- `GET /api/is/info?clientNumber=12345` - Client info by number
- `GET /api/is/info?clientName=Answer&processFields=true` - Client info by name with field processing

Example:
```bash
curl -H "X-API-Key: your-key" "http://localhost:3000/api/is/info?clientNumber=12345"
```
