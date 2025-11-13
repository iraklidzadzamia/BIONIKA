# How to View Logs - Frontend, Backend, and Meta-Bot

## 📋 Quick Summary

### View Separate Logs

| Service      | Docker Command                 | Local Command                             |
| ------------ | ------------------------------ | ----------------------------------------- |
| **Frontend** | Not in Docker (runs locally)   | `npm run dev:frontend` or browser console |
| **Backend**  | `npm run docker:logs:backend`  | `npm run dev:backend`                     |
| **Meta-Bot** | `npm run docker:logs:meta-bot` | `npm run dev:meta-bot`                    |
| **MongoDB**  | `npm run docker:logs:mongodb`  | Check MongoDB logs                        |
| **All**      | `npm run docker:logs`          | `npm run dev`                             |

### Browser Console Logs (Frontend)

Open browser DevTools (`F12` or `Cmd+Option+I`) to see:

- React component logs
- API request/response logs
- Redux state changes
- Error messages

---

## Quick Commands

### NPM Scripts (Added to package.json)

```bash
# View all Docker logs (live)
npm run docker:logs

# View backend logs only (live)
npm run docker:logs:backend

# View meta-bot logs only (live)
npm run docker:logs:meta-bot

# View MongoDB logs only (live)
npm run docker:logs:mongodb

# Check container status
npm run docker:ps
```

### View Frontend Logs (Local Development)

```bash
# Run frontend in development mode (logs appear in terminal)
npm run dev:frontend

# Frontend runs on port 5173 (Vite default)
# Logs will show:
# - Vite server startup
# - Hot module reload
# - Build errors/warnings
# - Network requests
```

---

## Docker Commands (When Running in Docker)

### Live Logs (Follow Mode)

```bash
# From root directory
cd docker

# All services (live, color-coded)
docker-compose logs -f

# Backend only (live)
docker-compose logs -f backend

# Meta-bot only (live)
docker-compose logs -f meta-bot

# MongoDB only (live)
docker-compose logs -f mongodb

# Multiple services
docker-compose logs -f backend meta-bot
```

**Press `Ctrl+C` to stop following logs**

### Historical Logs

```bash
cd docker

# Last 50 lines
docker-compose logs --tail=50 backend

# Last 100 lines with timestamps
docker-compose logs --tail=100 -t backend

# All logs since container started
docker-compose logs backend

# Logs from specific time
docker-compose logs --since 5m backend      # Last 5 minutes
docker-compose logs --since 1h backend      # Last 1 hour
docker-compose logs --since 2025-10-18 backend
```

### Filter Logs

```bash
# Search for specific text
docker-compose logs backend | grep "error"
docker-compose logs backend | grep "MongoDB"
docker-compose logs backend | grep "Socket"

# Search with context (lines before/after)
docker-compose logs backend | grep -A 5 "error"   # 5 lines after
docker-compose logs backend | grep -B 5 "error"   # 5 lines before
docker-compose logs backend | grep -C 5 "error"   # 5 lines before & after
```

---

## Local Development Logs (When Running npm run dev)

When you run services locally (not in Docker):

### Frontend Logs

```bash
# Run frontend only
npm run dev:frontend

# Logs show in terminal:
# - Vite server address
# - Hot reload updates
# - Module build errors
# - Network activity
```

### Backend Logs

```bash
# Run backend only
npm run dev:backend

# Logs show in terminal:
# - Server startup
# - MongoDB connection
# - API requests
# - Errors and warnings
```

### Meta-Bot Logs

```bash
# Run meta-bot only
npm run dev:meta-bot

# Logs show in terminal:
# - Webhook listeners
# - LLM API calls
# - Facebook/Instagram responses
# - Errors and warnings
```

### All Services Together

```bash
# Run all services - logs are interleaved
npm run dev

# Opens multiple terminals with separate logs for each service
```

**Logs will appear directly in your terminal with colors:**

- 🟢 Green: Info messages
- 🟡 Yellow: Warning messages
- 🔴 Red: Error messages

---

## Current Backend Status (From Your Logs)

Based on your current Docker logs, the backend is:

✅ **Running Successfully**

- Port: 3000
- MongoDB: Connected to Atlas (`ac-starj6a-shard-00-02.nvpulaz.mongodb.net`)
- Socket.io: Enabled
- Health checks: Passing every 30 seconds
- Token refresh: Job scheduled (every 24 hours)

**Recent Log Sample:**

```
✅ MongoDB connected: ac-starj6a-shard-00-02.nvpulaz.mongodb.net
✅ Socket.io server initialized
✅ Token refresh job scheduled (every 24 hours)
✅ Server running on port 3000 in development mode
✅ Health check: http://localhost:3000/health
✅ Socket.io enabled for real-time messaging
```

---

## Log Levels

The backend uses Winston logger with these levels:

| Level   | Color  | Usage                 |
| ------- | ------ | --------------------- |
| `error` | Red    | Critical errors       |
| `warn`  | Yellow | Warnings              |
| `info`  | Green  | General information   |
| `debug` | Blue   | Debugging information |

**Change log level** in `packages/backend/.env`:

```bash
LOG_LEVEL=info    # Default
LOG_LEVEL=debug   # More verbose
LOG_LEVEL=error   # Only errors
```

---

## Common Log Patterns

### Successful Startup

```
✅ MongoDB connected: [hostname]
✅ Socket.io server initialized
✅ Token refresh job scheduled
✅ Server running on port 3000
```

### Health Checks (Every 30 seconds)

```
::1 - - [date] "GET /health HTTP/1.1" 200 76 "-" "-"
```

### Database Errors

```
❌ MongoDB connection error: [error details]
```

### API Requests

```
[method] [path] [status] [response time]
::1 - - [date] "GET /api/appointments HTTP/1.1" 200 123 "-" "-"
```

---

## Debugging Tips

### 1. Watch Logs While Testing

Open two terminals:

**Terminal 1:** Watch logs

```bash
npm run docker:logs:backend
```

**Terminal 2:** Make requests

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/appointments
```

### 2. Find Errors Quickly

```bash
# Show only error lines
docker-compose logs backend | grep -i error

# Show only warnings and errors
docker-compose logs backend | grep -iE "error|warn"

# Count errors
docker-compose logs backend | grep -i error | wc -l
```

### 3. Monitor Multiple Services

```bash
# All services with timestamps
docker-compose logs -f -t

# Backend + Meta-bot together
docker-compose logs -f backend meta-bot
```

### 4. Save Logs to File

```bash
# Save all logs
docker-compose logs backend > backend-logs.txt

# Save with timestamps
docker-compose logs -t backend > backend-logs-$(date +%Y%m%d-%H%M%S).txt

# Save last 1000 lines
docker-compose logs --tail=1000 backend > backend-recent.txt
```

---

## Troubleshooting

### No Logs Appearing

```bash
# Check if container is running
npm run docker:ps
docker-compose ps

# Restart container
docker-compose restart backend

# View container status
docker inspect petbuddy-backend
```

### Container Keeps Restarting

```bash
# View all logs (including startup failures)
docker-compose logs backend

# Check last exit reason
docker inspect --format='{{.State.Status}}' petbuddy-backend
```

### Logs Too Verbose

Change log level in `packages/backend/.env`:

```bash
LOG_LEVEL=warn    # Only warnings and errors
LOG_LEVEL=error   # Only errors
```

Then restart:

```bash
docker-compose restart backend
```

---

## Log Files Location

### Docker Logs

Docker stores logs internally. View them with:

```bash
docker logs petbuddy-backend
```

### Local Development Logs

When running locally, logs only appear in terminal (not saved to file by default).

To save logs during local development:

```bash
npm run dev:backend 2>&1 | tee backend.log
```

---

## Real-Time Monitoring

### Watch Specific Patterns

```bash
# Watch for errors
docker-compose logs -f backend | grep --line-buffered -i error

# Watch for MongoDB operations
docker-compose logs -f backend | grep --line-buffered "MongoDB"

# Watch for API requests
docker-compose logs -f backend | grep --line-buffered "HTTP"
```

### Using watch command

```bash
# Refresh every 2 seconds
watch -n 2 'docker-compose logs --tail=20 backend'
```

---

## Production Logging

For production, consider:

1. **Log Aggregation Services:**

   - Datadog
   - LogDNA
   - Papertrail
   - CloudWatch (AWS)

2. **Log Files:**
   Configure Winston to write to files in production

3. **Log Rotation:**
   Use `winston-daily-rotate-file` to manage log size

---

## Summary of Commands

| Command                                     | Description                    |
| ------------------------------------------- | ------------------------------ |
| `npm run docker:logs`                       | View all Docker logs (live)    |
| `npm run docker:logs:backend`               | View backend logs (live)       |
| `npm run docker:logs:meta-bot`              | View meta-bot logs (live)      |
| `npm run docker:ps`                         | Check container status         |
| `docker-compose logs -f backend`            | Follow backend logs            |
| `docker-compose logs --tail=50 backend`     | Last 50 lines                  |
| `docker-compose logs backend \| grep error` | Filter errors                  |
| `npm run dev:backend`                       | Run locally (logs in terminal) |

---

## Your Current Setup

✅ **Backend is connected to MongoDB Atlas:**

```
mongodb+srv://petbuddytestuser:***@cluster0.nvpulaz.mongodb.net/petbudytest
```

✅ **All services healthy:**

- Backend: http://localhost:3000/health
- Meta-Bot: http://localhost:5001/health
- MongoDB: Port 27017

✅ **To view logs right now:**

```bash
npm run docker:logs:backend
```

Or for live updates:

```bash
cd docker && docker-compose logs -f backend
```
