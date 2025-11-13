# Docker Setup Guide for PetBuddy 2.0

## Quick Start - Docker Only (MongoDB)

If you only want to run MongoDB in Docker and run the app locally:

```bash
# Start MongoDB in Docker
npm run docker:up

# OR manually:
cd docker && docker-compose up -d mongodb

# Then run the app locally (in separate terminal):
npm run dev
```

MongoDB will be available at: `mongodb://admin:password123@localhost:27017/petbuddy?authSource=admin`

---

## Full Docker Deployment (All Services)

To run everything in Docker (MongoDB + Backend + Meta-Bot):

```bash
# Start all services
cd docker
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## Environment Configuration

### Docker .env File Created

A `docker/.env` file has been created with secure keys:

```bash
docker/.env  # ✅ Created with auto-generated secure keys
```

**Important:** The `docker/.env` file contains:

- Auto-generated secure JWT secrets (32+ characters)
- Auto-generated internal API key (32+ characters)
- MongoDB credentials
- Service URLs for container communication

---

## Docker Services

The Docker setup includes 3 services:

### 1. MongoDB Database

- **Container Name:** `petbuddy-mongodb`
- **Port:** `27017:27017`
- **Credentials:**
  - Username: `admin`
  - Password: `password123`
- **Connection String:** `mongodb://admin:password123@mongodb:27017/petbuddy?authSource=admin`
- **Health Check:** Pings MongoDB every 10 seconds

### 2. Backend API (Optional)

- **Container Name:** `petbuddy-backend`
- **Port:** `3000:3000`
- **Health Endpoint:** `http://localhost:3000/health`
- **Depends On:** MongoDB (waits for healthy status)

### 3. Meta-Bot Service (Optional)

- **Container Name:** `petbuddy-meta-bot`
- **Port:** `5001:5001`
- **Health Endpoint:** `http://localhost:5001/health`
- **Depends On:** MongoDB + Backend (waits for healthy status)

---

## Recommended Development Workflow

### Option 1: MongoDB in Docker, Apps Running Locally (RECOMMENDED)

This is the easiest way to develop:

```bash
# Terminal 1: Start MongoDB in Docker
npm run docker:up
# OR: cd docker && docker-compose up -d mongodb

# Terminal 2: Run all apps locally
npm run dev

# Individual services:
npm run dev:backend    # Port 3000
npm run dev:frontend   # Port 5173
npm run dev:meta-bot   # Port 5001
```

**Why this is recommended:**

- ✅ Fast hot-reload during development
- ✅ Easy debugging with source maps
- ✅ Simple to view logs
- ✅ MongoDB managed in Docker (no local installation needed)
- ✅ Code changes reflect immediately

**Configuration:**

- Backend uses `packages/backend/.env`
- Frontend uses `packages/frontend/.env.local`
- Meta-Bot uses `packages/meta-bot/.env`

### Option 2: Everything in Docker

For production-like testing:

```bash
# Start all services
cd docker && docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f meta-bot

# Rebuild after code changes
docker-compose up -d --build
```

**When to use this:**

- Testing deployment configuration
- Simulating production environment
- CI/CD pipeline testing

---

## Common Docker Commands

```bash
# Start services
docker-compose up -d              # All services in background
docker-compose up -d mongodb      # Only MongoDB

# Stop services
docker-compose down               # Stop and remove containers
docker-compose stop               # Stop but keep containers

# View logs
docker-compose logs -f            # All services
docker-compose logs -f backend    # Specific service
docker-compose logs --tail=100    # Last 100 lines

# Check status
docker-compose ps                 # List running containers
docker-compose top                # Show processes

# Rebuild containers
docker-compose build              # Build all
docker-compose build backend      # Build specific service
docker-compose up -d --build      # Rebuild and restart

# Clean up
docker-compose down -v            # Remove containers and volumes (DELETES DATA)
docker system prune -a            # Clean all Docker resources
```

---

## Troubleshooting

### Backend Container Failing with "INTERNAL_SERVICE_API_KEY too short"

**Fixed!** The `docker/.env` file now has proper 64-character keys.

If you still see this error:

```bash
cd docker
cat .env  # Verify keys are 64 characters
docker-compose down
docker-compose up -d
```

### Container Won't Start - "Port already in use"

Check what's using the port:

```bash
# macOS/Linux
lsof -i :3000   # Backend port
lsof -i :5001   # Meta-bot port
lsof -i :27017  # MongoDB port

# Kill process if needed
kill -9 <PID>
```

Or use different ports in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000" # Map to different host port
```

### MongoDB Data Persistence

MongoDB data is stored in a Docker volume `mongodb_data`:

```bash
# View volumes
docker volume ls

# Remove volume (DELETES ALL DATA)
docker volume rm docker_mongodb_data

# Backup data
docker exec petbuddy-mongodb mongodump --out /backup
```

### View Container Internals

```bash
# Access container shell
docker exec -it petbuddy-backend sh
docker exec -it petbuddy-mongodb mongosh

# Inspect container
docker inspect petbuddy-backend
```

### Health Check Failing

```bash
# Check health status
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' petbuddy-backend | jq

# Test health endpoint manually
curl http://localhost:3000/health
curl http://localhost:5001/health
```

---

## Configuration Files

| File                           | Purpose                              | Status     |
| ------------------------------ | ------------------------------------ | ---------- |
| `docker/.env`                  | Docker Compose environment variables | ✅ Created |
| `docker/.env.example`          | Template for Docker env              | ✅ Exists  |
| `docker/docker-compose.yml`    | Service definitions                  | ✅ Updated |
| `packages/backend/.env`        | Backend config (local dev)           | ✅ Created |
| `packages/meta-bot/.env`       | Meta-bot config (local dev)          | ✅ Created |
| `packages/frontend/.env.local` | Frontend config                      | ✅ Created |

---

## Security Notes

### Docker Environment Variables

The `docker/.env` file contains **secure auto-generated keys**:

```bash
JWT_ACCESS_SECRET=33ad8bf106b88c15d46cacef8f144ce82bde44e44751e0d2529a447313c029fb
JWT_REFRESH_SECRET=b9b7c4ef9e988c2068103b19678fbc59d63b3443a2650f7405e9234c81fdcfbc
INTERNAL_SERVICE_API_KEY=0eb19b8f9d7cbcf75c7c8c467f2635d67208fe32d2cc29cd5d047666c0255ac1
```

**Important:**

- ✅ These keys are for **local development only**
- ✅ All keys are 64 characters (meets 32-character minimum)
- ⚠️ **Generate new keys for production!**
- ⚠️ Never commit production keys to Git

### For Production

Generate new keys:

```bash
openssl rand -hex 32
```

---

## Network Architecture

Docker creates a bridge network: `docker_petbuddy-network`

**Container Communication:**

- Backend → MongoDB: `mongodb://admin:password123@mongodb:27017/petbuddy`
- Meta-Bot → Backend: `http://backend:3000`
- Meta-Bot → MongoDB: `mongodb://admin:password123@mongodb:27017/petbuddy`

**Host Access:**

- Backend: `http://localhost:3000`
- Meta-Bot: `http://localhost:5001`
- MongoDB: `mongodb://admin:password123@localhost:27017/petbuddy`

---

## Next Steps

1. **Start MongoDB:**

   ```bash
   npm run docker:up
   ```

2. **Run Apps Locally:**

   ```bash
   npm run dev
   ```

3. **Access Services:**

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - Meta-Bot: http://localhost:5001
   - MongoDB: localhost:27017

4. **Check Health:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:5001/health
   ```

---

## Related Documentation

- [Complete Environment Variables](../environment-variables.md)
- [Installation Guide](../guides/INSTALL.md)
- [Quick Reference](../guides/QUICK_REFERENCE.md)
- [Main README](../../README.md)
