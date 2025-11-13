# How to Restart Server After Changing .env Files

## 🚀 Quick Commands

### **After Changing ANY .env File:**

```bash
# Full reload (recommended - loads all env changes)
npm run docker:reload

# This does:
# 1. docker-compose down
# 2. docker-compose up -d
```

### **Quick Restart (Docker Running):**

```bash
# Restart all services
npm run docker:restart

# Restart backend only
npm run docker:restart:backend

# Restart meta-bot only
npm run docker:restart:meta-bot
```

---

## 📋 Step-by-Step Guide

### Scenario 1: Changed `packages/backend/.env`

**Option A - Running in Docker:**
```bash
# Quick restart (may not reload all env vars)
npm run docker:restart:backend

# OR full reload (recommended)
npm run docker:reload

# Verify changes loaded
npm run docker:logs:backend
```

**Option B - Running Locally:**
```bash
# Stop the backend (Ctrl+C in terminal)
# Then restart:
npm run dev:backend
```

---

### Scenario 2: Changed `packages/meta-bot/.env`

**Option A - Running in Docker:**
```bash
# Quick restart
npm run docker:restart:meta-bot

# OR full reload
npm run docker:reload

# Verify changes loaded
npm run docker:logs:meta-bot
```

**Option B - Running Locally:**
```bash
# Stop (Ctrl+C) and restart:
npm run dev:meta-bot
```

---

### Scenario 3: Changed `docker/.env`

**MUST do full reload (restart won't work):**
```bash
npm run docker:reload

# OR manually:
npm run docker:down
npm run docker:up
```

**Why?** Docker Compose reads `docker/.env` only at startup, not on restart.

---

### Scenario 4: Changed `packages/frontend/.env.local`

**Option A - Running in Docker:**
Frontend doesn't run in Docker by default (development only).

**Option B - Running Locally:**
```bash
# Vite dev server auto-reloads most changes
# But for env changes, stop (Ctrl+C) and restart:
npm run dev:frontend
```

**Note:** Frontend env vars must start with `NEXT_PUBLIC_` to be visible in browser.

---

## 🎯 Which .env File Changed?

| File Changed | Docker Command | Local Command |
|-------------|----------------|---------------|
| `packages/backend/.env` | `npm run docker:restart:backend` | Stop (Ctrl+C) + `npm run dev:backend` |
| `packages/meta-bot/.env` | `npm run docker:restart:meta-bot` | Stop (Ctrl+C) + `npm run dev:meta-bot` |
| `packages/frontend/.env.local` | N/A (runs locally) | Stop (Ctrl+C) + `npm run dev:frontend` |
| `docker/.env` | `npm run docker:reload` | N/A |

---

## ⚡ All Available Commands

### New Commands Added:

```bash
# Full reload (down + up)
npm run docker:reload

# Restart all services
npm run docker:restart

# Restart individual services
npm run docker:restart:backend
npm run docker:restart:meta-bot

# Check status
npm run docker:ps

# View logs after restart
npm run docker:logs:backend
npm run docker:logs:meta-bot
```

---

## 🔍 Verify Changes Loaded

After restarting, check if your changes were loaded:

### 1. Check Container Status
```bash
npm run docker:ps

# Should show:
# ✅ petbuddy-backend   - Up X seconds (healthy)
# ✅ petbuddy-meta-bot  - Up X seconds (healthy)
```

### 2. View Startup Logs
```bash
# Backend startup logs
npm run docker:logs:backend

# Look for:
# ✅ MongoDB connected
# ✅ Server running on port 3000
```

### 3. Check Environment Variables Inside Container
```bash
# View backend env vars
docker exec petbuddy-backend env | grep JWT_ACCESS_SECRET
docker exec petbuddy-backend env | grep MONGODB_URI

# View meta-bot env vars
docker exec petbuddy-meta-bot env | grep INTERNAL_SERVICE_API_KEY
```

---

## 🐛 Troubleshooting

### Changes Not Taking Effect?

**Problem:** Restarted but env changes not loading.

**Solution:** Use full reload instead of restart:
```bash
npm run docker:reload
```

**Why?** `restart` keeps the container, `down+up` recreates it with new env.

---

### Container Won't Start After Changes?

**Problem:** Container exits immediately or shows unhealthy.

**Check logs:**
```bash
npm run docker:logs:backend
```

**Common issues:**
- ❌ Invalid MongoDB URI format
- ❌ JWT secrets too short (need 32+ characters)
- ❌ Missing required variables
- ❌ Invalid JSON in env value

---

### Environment Variable Still Shows Old Value?

**Check which .env file is being used:**

| Running As | Reads From |
|-----------|------------|
| Docker backend | `docker/.env` |
| Docker meta-bot | `docker/.env` |
| Local backend | `packages/backend/.env` |
| Local meta-bot | `packages/meta-bot/.env` |
| Local frontend | `packages/frontend/.env.local` |

**If you changed the wrong file:**
1. Update the correct file
2. Restart the service

---

### Hot Reload Not Working?

**Local Development:**
- Backend/Meta-bot: NO hot reload - must restart manually
- Frontend: YES hot reload - but not for env vars

**To enable backend hot reload during development:**
Both backend and meta-bot use `nodemon` which watches for file changes.

Edit `.env` triggers restart automatically in local dev:
```bash
npm run dev:backend  # Auto-restarts on .env changes
```

---

## 📚 Examples

### Example 1: Change MongoDB Connection

**1. Edit the file:**
```bash
# Edit packages/backend/.env
# Change: MONGODB_URI=mongodb://localhost:27017/petbuddy
# To:     MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```

**2. Restart backend:**
```bash
# Docker:
npm run docker:reload

# Local:
# Stop (Ctrl+C) then:
npm run dev:backend
```

**3. Verify:**
```bash
npm run docker:logs:backend | grep "MongoDB connected"
# Should show: MongoDB connected: cluster.mongodb.net
```

---

### Example 2: Change JWT Secrets

**1. Generate new secrets:**
```bash
openssl rand -hex 32  # For JWT_ACCESS_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
```

**2. Update in ALL places** (must match):
```bash
# Edit these files with same secrets:
packages/backend/.env
packages/meta-bot/.env
docker/.env
```

**3. Restart all services:**
```bash
npm run docker:reload
```

**4. Verify:**
```bash
npm run docker:logs:backend | head -20
npm run docker:logs:meta-bot | head -20
```

---

### Example 3: Enable Debug Logging

**1. Edit backend .env:**
```bash
# Change: LOG_LEVEL=info
# To:     LOG_LEVEL=debug
```

**2. Restart:**
```bash
npm run docker:restart:backend
```

**3. View debug logs:**
```bash
npm run docker:logs:backend
# Should see more detailed logs
```

---

## ✅ Best Practices

1. **Always verify after restart:**
   ```bash
   npm run docker:ps           # Check status
   npm run docker:logs:backend # Check logs
   ```

2. **Use full reload for critical changes:**
   ```bash
   npm run docker:reload  # Safer than restart
   ```

3. **Keep env files in sync:**
   - JWT secrets must match in backend and meta-bot
   - INTERNAL_SERVICE_API_KEY must match
   - MONGODB_URI must match

4. **Test after changes:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:5001/health
   ```

5. **Commit .env.example, not .env:**
   - ✅ Commit: `.env.example` files
   - ❌ Never commit: `.env` files (contain secrets)

---

## 🎯 Your Current Setup

You're using **MongoDB Atlas**:
```
mongodb+srv://petbuddytestuser:***@cluster0.nvpulaz.mongodb.net/petbudytest
```

**If you change the MongoDB URI:**
1. Update `packages/backend/.env`
2. Update `packages/meta-bot/.env` (must match)
3. Update `docker/.env` (if using Docker)
4. Run: `npm run docker:reload`
5. Verify: `npm run docker:logs:backend | grep MongoDB`

---

## 📖 Summary

| Scenario | Command |
|----------|---------|
| After any .env change | `npm run docker:reload` (safest) |
| Quick backend restart | `npm run docker:restart:backend` |
| Quick meta-bot restart | `npm run docker:restart:meta-bot` |
| Restart all services | `npm run docker:restart` |
| Check if running | `npm run docker:ps` |
| View logs | `npm run docker:logs:backend` |
| Local dev restart | Stop (Ctrl+C) + `npm run dev:backend` |

**Remember:** Use `docker:reload` (down+up) instead of `docker:restart` when changing `docker/.env` or when restart doesn't work!
