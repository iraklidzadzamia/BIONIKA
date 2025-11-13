# Backend Dockerfile - Monorepo Structure
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy root package files for workspace setup (including package-lock.json)
COPY package.json package-lock.json ./

# Copy all package directories (for workspace resolution)
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# Install all dependencies using workspaces
RUN npm ci --workspaces

# Copy shared package source
COPY packages/shared/ ./packages/shared/

# Copy backend source code
COPY packages/backend/ ./packages/backend/

# Set working directory to backend for execution
WORKDIR /app/packages/backend

# Expose port
EXPOSE 3000

# Health check (increased start period for DB connection time)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
