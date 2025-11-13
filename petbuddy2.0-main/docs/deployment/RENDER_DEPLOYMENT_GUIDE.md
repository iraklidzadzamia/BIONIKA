# Render Deployment Guide - Docker Edition

This guide will help you deploy PetBuddy 2.0 to Render using Docker containers.

## 🎯 Why Docker on Render?

- ✅ Solves the mongoose dependency issue
- ✅ Consistent environment (same as local)
- ✅ MetaAndAI service has access to backend code
- ✅ All dependencies properly installed
- ✅ Better control over the deployment

## 📋 Prerequisites

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Render Account** - Sign up at https://render.com
3. **MongoDB Atlas Account** (or other MongoDB hosting) - Free tier available at https://www.mongodb.com/cloud/atlas

## 🚀 Step-by-Step Deployment

### Step 1: Set Up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user with password
4. Whitelist all IP addresses (0.0.0.0/0) for Render access
5. Get your connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/petbuddy?retryWrites=true&w=majority
   ```

### Step 2: Prepare Your Repository

1. **Commit all Docker files to your repository:**
   ```bash
   git add .
   git commit -m "Add Docker configuration for Render deployment"
   git push origin main
   ```

2. **Files that should be committed:**
   - ✅ `render.yaml`
   - ✅ `backend/Dockerfile`
   - ✅ `metaAndAI/Dockerfile`
   - ✅ `.dockerignore`
   - ✅ `docker-compose.yml` (optional, for local dev)
   - ❌ `.env` (DO NOT COMMIT - already in .gitignore)

### Step 3: Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **"Apply"**
6. Render will create both services automatically

#### Option B: Manual Setup

**For Backend Service:**

1. Go to Render Dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `petbuddy-backend`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Docker Build Context Directory**: `.` (root)
   - **Plan**: Free

**For Meta-Bot Service:**

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `petbuddy-meta-bot`
   - **Region**: Oregon (same as backend)
   - **Branch**: `main`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./metaAndAI/Dockerfile`
   - **Docker Build Context Directory**: `.` (root)
   - **Plan**: Free

### Step 4: Configure Environment Variables

#### Backend Service Environment Variables:

Go to your backend service → **Environment** tab → Add:

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/petbuddy?retryWrites=true&w=majority
JWT_SECRET=5687fe94dc85fc7a5e3a6a4fedd241942e06ac426dcf641ba60f7b5a9a4887f8df8ee6bb4fe52f20a9a90287d6d287aa5c96ad557daf96b40d69041db92d6472
JWT_REFRESH_SECRET=cbbc294ac7228ed7619f32c91f48616d4f6933af560f0bb1ffaee0580af59282ad49f1f10b4aa6d6f600b9e8a6c41949365f7d1c838927b0fa08f023cec7dd23
FRONTEND_URL=https://your-frontend-url.com
META_BOT_URL=https://petbuddy-meta-bot.onrender.com
```

**Important Notes:**
- Replace `MONGODB_URI` with your actual MongoDB Atlas connection string
- Replace `FRONTEND_URL` with your actual frontend URL
- Replace `META_BOT_URL` with your actual meta-bot Render URL (you'll get this after deployment)
- JWT secrets are already generated (from your .env file)

#### Meta-Bot Service Environment Variables:

Go to your meta-bot service → **Environment** tab → Add:

```bash
NODE_ENV=production
META_BOT_PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/petbuddy?retryWrites=true&w=majority
VERIFY_TOKEN=your-facebook-verify-token
PAGE_ACCESS_TOKEN=your-facebook-page-access-token
APP_SECRET=your-facebook-app-secret
BACKEND_API_URL=https://petbuddy-backend.onrender.com
OPENAI_API_KEY=your-openai-api-key
```

**Important Notes:**
- Use the **SAME** `MONGODB_URI` as backend
- Replace `BACKEND_API_URL` with your actual backend Render URL
- Get Facebook tokens from: https://developers.facebook.com/
- Get OpenAI API key from: https://platform.openai.com/api-keys

### Step 5: Deploy!

1. After adding all environment variables, click **"Manual Deploy"** → **"Deploy latest commit"**
2. Watch the build logs
3. Wait for both services to become "Live" (green status)

**Build time:** First build takes 5-10 minutes (Docker image build + npm install)

### Step 6: Verify Deployment

Once deployed, test your services:

**Backend Health Check:**
```bash
curl https://petbuddy-backend.onrender.com/health
```

Expected response:
```json
{"status":"OK","timestamp":"2025-10-14T...","uptime":123.456}
```

**Meta-Bot Health Check:**
```bash
curl https://petbuddy-meta-bot.onrender.com/health
```

Expected response:
```json
{"status":"healthy","service":"Meta Bot Server","timestamp":"2025-10-14T..."}
```

## 🔧 Troubleshooting

### Build Fails

**Check:**
1. Is your `render.yaml` committed to the repository?
2. Are `Dockerfile` paths correct?
3. Check build logs for specific errors

### Service Unhealthy

**Check:**
1. Environment variables are set correctly
2. MongoDB connection string is correct
3. MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
4. Health check endpoint responds: `/health`

### Mongoose Error Still Appears

**This should NOT happen with Docker**, but if it does:
1. Check that `dockerContext: .` is set (root directory)
2. Verify Dockerfile copies both backend and metaAndAI code
3. Check build logs to ensure `npm ci` runs for both directories

### Meta-Bot Can't Connect to Backend

**Check:**
1. `BACKEND_API_URL` in meta-bot points to correct backend URL
2. Both services are in the same region (lower latency)
3. Backend is healthy before meta-bot starts

## 📊 Monitoring

### View Logs:
- Go to service → **Logs** tab
- Real-time logs show all console output

### View Metrics:
- Go to service → **Metrics** tab
- CPU, Memory, Response times

### Health Checks:
- Render automatically checks `/health` endpoint every 30 seconds
- If unhealthy for 5 checks, service is marked as down

## 💰 Free Tier Limits

Render Free Tier includes:
- ✅ 750 hours/month (enough for 1 service running 24/7)
- ✅ Services sleep after 15 minutes of inactivity
- ✅ Cold start time: ~30 seconds
- ✅ Shared resources

**Tip:** For production, upgrade to paid tier ($7/month per service) for:
- No sleeping
- More resources
- Faster response times

## 🔄 Updates & Redeployment

### Auto-Deploy (Recommended):
1. Enable **Auto-Deploy** in service settings
2. Every `git push` to main branch triggers automatic deployment

### Manual Deploy:
1. Go to service → **Manual Deploy** → **Deploy latest commit**

## 📞 Support

### Render Support:
- Documentation: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

### PetBuddy Issues:
- Check logs first
- Verify environment variables
- Test locally with Docker first: `docker-compose up`

## ✅ Deployment Checklist

Before going live:

- [ ] MongoDB Atlas cluster created and configured
- [ ] All environment variables set in Render
- [ ] Both services deployed and healthy
- [ ] Health checks passing
- [ ] Backend accessible via HTTPS
- [ ] Meta-bot accessible via HTTPS
- [ ] Facebook webhook configured (if using Meta features)
- [ ] OpenAI API key valid (if using AI features)
- [ ] Frontend updated with production API URLs
- [ ] Test user registration and login
- [ ] Test booking creation
- [ ] Monitor logs for errors

## 🎉 Success!

Your PetBuddy application is now live on Render with Docker!

The mongoose dependency issue is completely resolved because:
- ✅ Docker ensures all dependencies are properly installed
- ✅ MetaAndAI container includes backend code
- ✅ Consistent environment between local and production
- ✅ All imports work correctly

**Your service URLs:**
- Backend: `https://petbuddy-backend.onrender.com`
- Meta-bot: `https://petbuddy-meta-bot.onrender.com`

Happy deploying! 🚀
