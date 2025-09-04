# Use Node.js LTS version with explicit platform
FROM --platform=linux/amd64 node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate build timestamp and build the application
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose the port (Nitro default is 3000)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", ".output/server/index.mjs"]