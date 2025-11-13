# Test PetBuddy Project Locally - Step by Step

You've successfully installed all dependencies! Now let's test the project.

## Current Status
✅ Dependencies installed (1250 packages)
✅ Environment files configured
✅ Docker Desktop installed
⏳ Ready to start services

---

## Quick Start (3 Commands)

### Step 1: Start MongoDB

**Option A: Using Docker Desktop GUI**
1. Open **Docker Desktop**
2. Open **Windows PowerShell** or **Command Prompt**
3. Navigate to project:
   ```powershell
   cd C:\new-petbuddy\petbuddy2.0\docker
   ```
4. Start MongoDB:
   ```powershell
   docker compose up -d mongodb
   ```

**Option B: Double-click the script**
- Just run: `START_MONGODB_DOCKER.bat` or `START_MONGODB_DOCKER.ps1`

**Verify MongoDB is running:**
```powershell
# Check container status
docker ps

# Should show:
# petbuddy-mongodb   Up X seconds   27017/tcp
```

**Test MongoDB connection:**
```powershell
docker exec -it petbuddy-mongodb mongosh -u admin -p petbuddy_mongo_2024_secure

# Inside mongosh:
show dbs
use petbuddy
exit
```

---

### Step 2: Start Backend

In a **new terminal/PowerShell window**:

```powershell
# Navigate to project
cd C:\new-petbuddy\petbuddy2.0

# Start backend
npm run dev:backend
```

**Expected output:**
```
> @petbuddy/backend@1.0.0 dev
> nodemon src/server.js

[nodemon] starting `node src/server.js`
MongoDB connected successfully
Server running on port 3000
```

---

### Step 3: Test Backend

In **another terminal**:

```powershell
# Test health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"..."}
```

**Or open in browser:**
- http://localhost:3000/health

---

## Full Testing Checklist

### ✅ Backend API Endpoints

```powershell
# Health check
curl http://localhost:3000/health

# Get default service categories
curl http://localhost:3000/api/catalog/service-categories

# Test auth endpoint
curl http://localhost:3000/api/auth/csrf
```

---

## Troubleshooting

### Problem: "docker: command not found"

**Solution:** Make sure Docker Desktop is running
1. Open **Docker Desktop** application
2. Wait for it to fully start (whale icon in system tray)
3. Try again

---

### Problem: "Port 27017 already in use"

**Solution:** Another MongoDB instance is running

```powershell
# Stop the container
docker stop petbuddy-mongodb

# Remove the container
docker rm petbuddy-mongodb

# Start fresh
docker compose up -d mongodb
```

---

### Problem: "Cannot connect to MongoDB"

**Check 1: Is container running?**
```powershell
docker ps | findstr mongodb
```

**Check 2: Container logs**
```powershell
docker logs petbuddy-mongodb
```

**Check 3: Restart container**
```powershell
docker restart petbuddy-mongodb
```

---

### Problem: Backend shows "ECONNREFUSED ::1:27017"

**Solution:** Update MongoDB URI in `packages/backend/.env`

Change:
```env
MONGODB_URI=mongodb://localhost:27017/petbuddy
```

To:
```env
MONGODB_URI=mongodb://admin:petbuddy_mongo_2024_secure@127.0.0.1:27017/petbuddy?authSource=admin
```

Then restart backend.

---

## What's Running?

After successful setup:

| Service   | Port | URL                      | Status Check                    |
|-----------|------|--------------------------|--------------------------------|
| MongoDB   | 27017| localhost:27017          | `docker ps`                    |
| Backend   | 3000 | http://localhost:3000    | `curl localhost:3000/health`   |

---

## Seed Database (Optional)

Add sample data for testing:

```powershell
# Run seed script
cd packages/backend
node src/seed/index.js
```

This will create:
- Demo company
- Sample services
- Test appointments
- AI prompts

---

## Stop Services

When done testing:

```powershell
# Stop backend (Ctrl+C in terminal where it's running)

# Stop MongoDB
docker stop petbuddy-mongodb

# Or stop all containers
cd docker
docker compose down
```

---

## Next Steps After Local Testing

Once everything works locally:

1. **Test with Docker** (full stack)
   ```powershell
   cd docker
   docker compose up -d
   ```

2. **Deploy to Production**
   - See: `docs/RENDER_DEPLOYMENT_GUIDE.md`
   - Or use Railway, DigitalOcean, AWS, etc.

---

## Quick Commands Reference

```powershell
# Start MongoDB only
cd docker && docker compose up -d mongodb

# Start backend only
npm run dev:backend

# Start all services with Docker
cd docker && docker compose up -d

# View logs
docker compose logs -f

# Stop all
docker compose down

# Restart backend (if code changed)
Ctrl+C in backend terminal, then: npm run dev:backend
```

---

## Need Help?

1. Check logs:
   ```powershell
   # MongoDB logs
   docker logs petbuddy-mongodb

   # Backend logs (visible in terminal where you ran dev:backend)
   ```

2. Check environment variables:
   - `packages/backend/.env`
   - `docker/.env`

3. Verify MongoDB connection string matches in both .env files

---

**Current Status:** Ready to test!
**Next Command:** `cd docker && docker compose up -d mongodb`
