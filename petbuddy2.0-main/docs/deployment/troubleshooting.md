# Deployment Troubleshooting Guide

Common issues and solutions for deploying PetBuddy.

---

## 🚨 Quick Diagnosis

### Run Diagnostic Endpoint

```bash
# Check backend health
curl https://your-backend.onrender.com/api/v1/diagnostics/status
```

This shows:
- ✅ Database connection status
- ✅ Environment variables set/missing
- ✅ CORS configuration
- ⚠️  Warnings

---

## 🎯 Frontend Issues (Vercel)

### 404 Not Found on `/api/v1/*`

**Symptoms:**
- API endpoints return 404
- "Route not found" errors

**Cause:** Backend URL not configured

**Solution:**
```bash
# 1. Check environment variable in Vercel
Settings → Environment Variables → Check NEXT_PUBLIC_BACKEND_ORIGIN

# 2. Add if missing
NEXT_PUBLIC_BACKEND_ORIGIN=https://your-backend.onrender.com

# 3. Redeploy
Deployments → Latest → Redeploy
```

**Verify:**
```bash
curl https://your-app.vercel.app/api/v1/health
# Should return: {"status":"OK"}
```

---

### CORS Errors

**Symptoms:**
```
Access to fetch has been blocked by CORS policy
```

**Cause:** Vercel domain not in backend CORS whitelist

**Solution:**
```bash
# 1. Go to Render → Your Backend → Environment
# 2. Add/update:
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGINS=https://your-app.vercel.app

# 3. Save (triggers redeploy)
```

**For multiple domains:**
```bash
CORS_ORIGINS=https://your-app.vercel.app,https://www.yoursite.com
```

---

### Environment Variables Not Loading

**Symptoms:**
- Variables are `undefined` in browser
- Features not working

**Cause:** Wrong prefix or not redeployed

**Solution:**
1. **Check prefix**: Must start with `NEXT_PUBLIC_`
   ```
   ✅ NEXT_PUBLIC_BACKEND_ORIGIN
   ❌ BACKEND_ORIGIN (won't work in browser)
   ```

2. **Redeploy after adding variables**
   - Vercel doesn't reload automatically
   - Manual redeploy required

3. **Clear browser cache**
   - Hard refresh: `Ctrl + Shift + R`

---

## 🖥️ Backend Issues (Render)

### 500 Internal Server Error

**Symptoms:**
- API returns 500 error
- Registration/login fails

**Step 1: Check Diagnostic**
```bash
curl https://your-backend.onrender.com/api/v1/diagnostics/status
```

Look for:
```json
{
  "status": "unhealthy",
  "environmentVariables": {
    "MONGODB_URI": false,  ← Missing!
    "JWT_ACCESS_SECRET": true
  },
  "warnings": ["Missing required environment variables"]
}
```

**Step 2: Check Render Logs**
1. Render Dashboard → Your Service
2. **Logs** tab
3. Look for recent errors

Common errors:
```
MongooseError: Connection failed
Error: JWT_ACCESS_SECRET is not defined
ValidationError: ...
```

**Step 3: Fix Missing Variables**

Required variables:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/petbuddy
JWT_ACCESS_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<32+ char random string>
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGINS=https://your-app.vercel.app
INTERNAL_SERVICE_API_KEY=<32+ char random string>
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Database Connection Failed

**Symptoms:**
```json
{
  "database": {
    "status": "disconnected",
    "error": "Connection timeout"
  }
}
```

**Common Causes:**

**1. Wrong MongoDB URI**
```bash
# Check format
mongodb+srv://username:password@cluster.mongodb.net/database

# Common mistakes:
# - Wrong password
# - Missing database name
# - Wrong cluster URL
```

**2. IP Whitelist (MongoDB Atlas)**
```
MongoDB Atlas → Network Access → Add IP Address
→ Add: 0.0.0.0/0 (allow all)
```

**3. Database Not Running**
- Check MongoDB Atlas dashboard
- Verify cluster is active

**Solution:**
1. Test connection with MongoDB Compass
2. Use exact same URI in Render
3. Add `0.0.0.0/0` to IP whitelist
4. Redeploy

---

### Build Failures

**Symptoms:**
- Deploy fails
- "Build failed" in logs

**Common Causes:**

**1. Missing Dependencies**
```bash
# Check package.json includes all deps
npm install
```

**2. TypeScript Errors**
```bash
# Check locally
npm run build
# Fix all errors before deploying
```

**3. Environment Variables in Build**
- Most env vars only needed at runtime
- Build-time vars must be in Render build settings

---

## 🗄️ Database Issues

### Collections Not Created

**Symptoms:**
- Empty database
- "Collection not found" errors

**Solution:**
```bash
# Connect to your database
mongosh "your-mongodb-uri"

# Check collections
show collections

# If empty, seed the database
cd packages/backend
node src/seed/index.js
```

---

### Duplicate Key Errors

**Symptoms:**
```
MongoError: E11000 duplicate key error
```

**Cause:** Trying to insert duplicate unique field (usually email)

**Solution:**
- Use different email
- Or drop the collection and reseed:
  ```bash
  mongosh "your-uri"
  use petbuddy
  db.users.drop()
  db.companies.drop()
  exit
  # Then reseed
  ```

---

## 🔐 Authentication Issues

### JWT Token Errors

**Symptoms:**
- "Invalid token" errors
- Auto-logout issues

**Causes:**
1. **Different secrets in frontend/backend**
   - Both must use same `JWT_ACCESS_SECRET`

2. **Secrets changed**
   - Invalidates existing tokens
   - Users must login again

**Solution:**
- Verify secrets match
- Generate new secrets consistently
- Clear cookies if testing

---

### Cookie Issues

**Symptoms:**
- Not staying logged in
- Session expires immediately

**Causes:**
1. **SameSite cookie setting**
   - Production needs `SameSite=None; Secure`

2. **Domain mismatch**
   - Frontend and backend on different domains

**Solution in Backend:**
```javascript
// Backend automatically sets this
config.cookie.sameSite = production ? 'none' : 'lax'
config.cookie.secure = production ? true : false
```

Verify `NODE_ENV=production` in Render

---

## 📊 Diagnostic Command Reference

### Backend Health Check
```bash
curl https://your-backend.onrender.com/health
# Expected: {"status":"OK","timestamp":"...","uptime":123}
```

### Diagnostic Status
```bash
curl https://your-backend.onrender.com/api/v1/diagnostics/status
# Shows all configuration issues
```

### Test Registration (No DB save)
```bash
curl -X POST https://your-backend.onrender.com/api/v1/diagnostics/test-registration \
  -H "Content-Type: application/json" \
  -d '{"company":{"name":"Test","email":"test@example.com","timezone":"UTC"},"user":{"fullName":"Test","email":"user@example.com","password":"Test123"}}'
```

### Test Actual Registration
```bash
curl -X POST https://your-backend.onrender.com/api/v1/auth/register-manager \
  -H "Content-Type: application/json" \
  -d '{"company":{"name":"Test Company","email":"test@example.com","timezone":"America/New_York"},"user":{"fullName":"Test User","email":"user@example.com","password":"Test123456"}}'
# Expected: 201 Created with user data
```

---

## 🆘 Still Stuck?

### Checklist

- [ ] Diagnostic endpoint shows `"status": "healthy"`
- [ ] Backend health check returns 200 OK
- [ ] All environment variables set correctly
- [ ] MongoDB connection successful
- [ ] Frontend can reach backend
- [ ] CORS configured properly
- [ ] Secrets are 32+ characters
- [ ] Redeployed after changes

### Get Help

1. **Run diagnostic**: Share output of `/diagnostics/status`
2. **Check logs**: Share error messages from Render
3. **Test directly**: Try curl commands above
4. **Verify URLs**: Double-check all URLs are correct

---

## 📚 Related Guides

- [Vercel Deployment](VERCEL_DEPLOYMENT.md)
- [Render Deployment](RENDER_DEPLOYMENT_GUIDE.md)
- [Environment Variables](../environment-variables.md)

---

**Last Updated**: October 2025
