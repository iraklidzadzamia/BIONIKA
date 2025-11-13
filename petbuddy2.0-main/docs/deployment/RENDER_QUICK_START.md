# Render Deployment - Quick Start

## 🚀 5-Minute Setup

### Prerequisites Checklist
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas account created
- [ ] Render account created

### Step 1: Commit Docker Files (1 minute)
```bash
git add render.yaml backend/Dockerfile metaAndAI/Dockerfile .dockerignore
git commit -m "Add Docker configuration for Render"
git push origin main
```

### Step 2: Deploy to Render (2 minutes)
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Select your GitHub repository
4. Click **"Apply"**

### Step 3: Set Environment Variables (2 minutes)

**Backend Service:**
```bash
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<copy-from-local-.env-file>
JWT_REFRESH_SECRET=<copy-from-local-.env-file>
FRONTEND_URL=<your-frontend-url>
META_BOT_URL=https://petbuddy-meta-bot.onrender.com
```

**Meta-Bot Service:**
```bash
MONGODB_URI=<same-as-backend>
BACKEND_API_URL=https://petbuddy-backend.onrender.com
VERIFY_TOKEN=<your-facebook-token>
PAGE_ACCESS_TOKEN=<your-facebook-token>
APP_SECRET=<your-facebook-secret>
OPENAI_API_KEY=<your-openai-key>
```

### Step 4: Wait for Deployment
- First deploy takes ~5-10 minutes
- Watch the logs for any errors
- Services will show "Live" when ready

### Step 5: Test
```bash
curl https://petbuddy-backend.onrender.com/health
curl https://petbuddy-meta-bot.onrender.com/health
```

## 🎯 Expected Result
Both services return healthy status → ✅ Deployment successful!

## 📚 Full Documentation
See [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) for detailed instructions.

## ❓ Need Help?
1. Check service logs in Render dashboard
2. Verify environment variables are set
3. Ensure MongoDB Atlas allows all IPs (0.0.0.0/0)
4. Check [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) troubleshooting section
