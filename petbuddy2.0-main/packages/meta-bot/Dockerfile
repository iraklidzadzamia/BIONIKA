# Meta-Bot Dockerfile - Monorepo Structure
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy root package files for workspace setup (including package-lock.json)
COPY package.json package-lock.json ./

# Copy all package directories (for workspace resolution)
COPY packages/shared/package*.json ./packages/shared/
COPY packages/meta-bot/package*.json ./packages/meta-bot/
COPY packages/backend/package*.json ./packages/backend/

# Install all dependencies using workspaces
RUN npm ci --workspaces

# Copy shared package source
COPY packages/shared/ ./packages/shared/

# Copy backend source (needed for BookingService and other backend services)
COPY packages/backend/src/services/ ./packages/backend/src/services/
COPY packages/backend/src/config/ ./packages/backend/src/config/
COPY packages/backend/src/utils/ ./packages/backend/src/utils/
COPY packages/backend/src/models/ ./packages/backend/src/models/

# Copy meta-bot source code
COPY packages/meta-bot/ ./packages/meta-bot/

# Set working directory to meta-bot for execution
WORKDIR /app/packages/meta-bot

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
