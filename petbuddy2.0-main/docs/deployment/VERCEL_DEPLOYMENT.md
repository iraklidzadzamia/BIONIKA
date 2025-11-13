# Vercel Deployment Guide

Complete guide for deploying the PetBuddy frontend to Vercel.

---

## 🎯 TL;DR - Quick Setup

### 1. Set ONE Environment Variable in Vercel

```
NEXT_PUBLIC_BACKEND_ORIGIN=https://your-backend.onrender.com
```

### 2. Deploy

Push to GitHub → Vercel auto-deploys

**That's it!** Everything else is automatic.

---

## 📋 Detailed Setup

### Step 1: Prepare Your Backend

Deploy your backend first (see [Backend Deployment](RENDER_DEPLOYMENT_GUIDE.md))

You'll need the backend URL (e.g., `https://petbuddy-api.onrender.com`)

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 3: Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build` (auto)
   - **Install Command**: `npm install` (auto)

### Step 4: Add Environment Variable

In Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   Name:  NEXT_PUBLIC_BACKEND_ORIGIN
   Value: https://your-backend.onrender.com
   ```
3. Apply to: **Production**, **Preview**, **Development**

### Step 5: Deploy

Click **"Deploy"** - Wait 2-3 minutes

Your app will be live at: `https://your-project.vercel.app`

---

## ⚙️ How It Works

### API Routing

The frontend proxies all API requests to your backend:

```
User Request: https://your-project.vercel.app/api/v1/auth/login
              ↓ (Next.js rewrite)
Backend:      https://your-backend.onrender.com/api/v1/auth/login
```

This is configured in `next.config.js`:
```javascript
async rewrites() {
  return [{
    source: '/api/:path*',
    destination: `${backendOrigin}/api/:path*`,
  }];
}
```

### Environment Variables

**Only ONE variable needed:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_BACKEND_ORIGIN` | Backend server URL | `https://petbuddy-api.onrender.com` |

**Everything else is automatic:**
- API calls use this URL
- Socket.io connects to this URL
- CORS handled by backend

---

## 🔧 Optional Configuration

### Custom Domain

1. Vercel Dashboard → Your Project
2. **Settings** → **Domains**
3. Add your domain
4. Update DNS records (Vercel provides instructions)

### Preview Deployments

Every PR automatically gets a preview URL:
- `https://your-project-git-branch-name.vercel.app`

### Environment Variables Per Branch

Different URLs for different environments:

| Environment | Variable Value |
|-------------|---------------|
| **Production** | `https://api.yoursite.com` |
| **Preview** | `https://api-staging.yoursite.com` |
| **Development** | `http://localhost:4000` |

---

## 🐛 Troubleshooting

### Issue: 404 on API Endpoints

**Problem:** `/api/v1/*` returns 404

**Solution:**
1. Check `NEXT_PUBLIC_BACKEND_ORIGIN` is set in Vercel
2. Verify backend URL is correct
3. Test backend directly: `curl https://your-backend.com/health`
4. Redeploy after adding variables

### Issue: 500 Internal Server Error

**Problem:** API returns 500 error

**Solution:**
1. Backend is receiving requests (good!)
2. Check backend logs on Render
3. Verify backend environment variables
4. See [Backend Troubleshooting](./troubleshooting.md#backend-500-errors)

### Issue: CORS Errors

**Problem:** CORS policy blocking requests

**Solution:**
1. Add Vercel domain to backend `CORS_ORIGINS`
2. Backend `.env`:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   CORS_ORIGINS=https://your-project.vercel.app
   ```
3. Redeploy backend

### Issue: Environment Variables Not Working

**Problem:** Variables are undefined

**Solution:**
1. Variables MUST start with `NEXT_PUBLIC_`
2. Redeploy after adding variables
3. Check in Vercel: Settings → Environment Variables
4. Clear browser cache

---

## ✅ Verification

### 1. Check Build Logs

Vercel Dashboard → Deployments → Latest → Build Logs

Should show:
```
✓ Creating an optimized production build
✓ Compiled successfully
```

### 2. Test API Connection

Open DevTools Console on your live site:
```javascript
fetch('/api/v1/health')
  .then(r => r.json())
  .then(console.log)
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "uptime": 123
}
```

### 3. Check Environment Config

Console should show:
```
📋 Frontend Configuration Loaded:
  - Backend Origin: https://your-backend.com
  - API URL: https://your-backend.com
  - Socket URL: https://your-backend.com
```

---

## 🔄 Redeployment

### When to Redeploy

- After adding/changing environment variables
- After updating code
- If something isn't working

### How to Redeploy

**Option 1: Push to GitHub**
```bash
git commit --allow-empty -m "Redeploy"
git push origin main
```

**Option 2: Manual Redeploy**
1. Vercel Dashboard → Deployments
2. Click latest deployment
3. Click **"Redeploy"**

---

## 📚 Related Documentation

- **Backend Deployment**: [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md)
- **Environment Variables**: [Environment Setup](../environment-variables.md)
- **Troubleshooting**: [troubleshooting.md](troubleshooting.md)
- **Quick Reference**: [Frontend Quick Start](../../packages/frontend/QUICK_START.md)

---

## 🎉 Success Checklist

- [ ] Backend deployed and accessible
- [ ] Pushed code to GitHub
- [ ] Imported project to Vercel
- [ ] Set `NEXT_PUBLIC_BACKEND_ORIGIN`
- [ ] Deployed successfully
- [ ] Tested API endpoints
- [ ] No CORS errors
- [ ] Updated backend `CORS_ORIGINS`

---

**Your frontend is now live!** 🚀

Next: Configure custom domain or set up CI/CD
