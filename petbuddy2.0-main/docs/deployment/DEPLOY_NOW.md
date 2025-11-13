# 🚀 Deploy PetBuddy to Render - Quick Guide

Follow these steps to deploy your application to Render.

---

## ✅ Pre-Deployment Checklist

Before deploying, make sure you have:

- [x] Backend running locally ✅ (You already did this!)
- [ ] GitHub account
- [ ] Render account (free) - Sign up at https://render.com
- [ ] MongoDB Atlas connection string (You already have this! `petbudytest`)

---

## 📦 Step 1: Push Code to GitHub

Your code needs to be on GitHub for Render to access it.

### If you don't have a GitHub repo yet:

1. **Go to GitHub**: https://github.com/new
2. **Create a new repository:**
   - Name: `petbuddy2.0`
   - Visibility: Private (recommended) or Public
   - Don't initialize with README (you already have one)

3. **Push your code:**
   ```powershell
   # In your project directory
   cd C:\new-petbuddy\petbuddy2.0

   # Initialize git (if not already done)
   git init

   # Add all files
   git add .

   # Commit
   git commit -m "Initial commit: PetBuddy 2.0 monorepo with Docker"

   # Add remote (replace YOUR-USERNAME with your GitHub username)
   git remote add origin https://github.com/YOUR-USERNAME/petbuddy2.0.git

   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### If you already have a GitHub repo:

```powershell
git add .
git commit -m "Add deployment configuration"
git push origin main
```

---

## 🎯 Step 2: Deploy to Render (Automatic with Blueprint)

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Click "New +" button** → Select **"Blueprint"**

3. **Connect GitHub:**
   - Click "Connect GitHub"
   - Authorize Render to access your repositories
   - Select your `petbuddy2.0` repository

4. **Render detects render.yaml:**
   - Render will automatically find your `render.yaml` file
   - It will show 2 services:
     - ✅ `petbuddy-backend`
     - ✅ `petbuddy-meta-bot`

5. **Click "Apply"**
   - Render will create both services
   - Initial setup takes 1-2 minutes

---

## 🔧 Step 3: Configure Environment Variables

After services are created, you need to add some environment variables manually.

### A. Backend Service

1. Go to **petbuddy-backend** service
2. Click **"Environment"** tab
3. **Add these variables** (click "+ Add Environment Variable"):

```
MONGODB_URI
mongodb+srv://petbuddytestuser:G8mWGeeP8X4JVsPh@cluster0.nvpulaz.mongodb.net/petbudytest?retryWrites=true&w=majority&appName=Cluster0
```

That's it for backend! (Other variables are auto-generated)

### B. Meta-Bot Service

1. Go to **petbuddy-meta-bot** service
2. Click **"Environment"** tab
3. **Add these variables:**

```
MONGODB_URI
mongodb+srv://petbuddytestuser:G8mWGeeP8X4JVsPh@cluster0.nvpulaz.mongodb.net/petbudytest?retryWrites=true&w=majority&appName=Cluster0

VERIFY_TOKEN
my_secure_verify_token_2024

PAGE_ACCESS_TOKEN
REPLACE_WITH_YOUR_FACEBOOK_PAGE_TOKEN

APP_SECRET
REPLACE_WITH_YOUR_FACEBOOK_APP_SECRET

OPENAI_API_KEY
REPLACE_WITH_YOUR_OPENAI_KEY
```

**Note:** If you don't have Facebook/OpenAI keys yet, you can add dummy values for now. The backend will work independently.

---

## 🚀 Step 4: Deploy!

1. After adding environment variables, go to each service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Watch the build logs (takes 5-10 minutes for first deploy)

**What's happening:**
- Building Docker images
- Installing npm dependencies
- Starting services

---

## ✅ Step 5: Verify Deployment

Once both services show **"Live"** status (green):

### Test Backend:

In PowerShell or browser, visit:
```
https://petbuddy-backend.onrender.com/health
```

**Expected response:**
```json
{"status":"OK","timestamp":"...","uptime":...}
```

### Test Meta-Bot:

```
https://petbuddy-meta-bot.onrender.com/health
```

**Expected response:**
```json
{"status":"healthy","service":"Meta Bot Server"}
```

---

## 🎉 Success! Your URLs

After deployment, you'll have:

- **Backend API**: `https://petbuddy-backend.onrender.com`
- **Meta Bot**: `https://petbuddy-meta-bot.onrender.com`

Copy these URLs - you'll need them for:
- Frontend configuration
- Facebook webhook setup
- API testing

---

## ⚠️ Important Notes

### Free Tier Limitations

- ✅ 750 hours/month free (enough for 1 service 24/7)
- ⚠️ Services **sleep after 15 minutes** of inactivity
- ⏱️ **Cold start time**: 30-50 seconds when waking up
- 💡 **Tip**: First request after sleep will be slow, then normal speed

### Keep Services Awake (Optional)

To prevent sleeping, you can:
1. Use a service like UptimeRobot to ping your app every 5 minutes
2. Upgrade to paid tier ($7/month per service)

---

## 🔄 Updating Your Deployment

### Auto-Deploy (Recommended):

1. Go to each service → **Settings**
2. Enable **"Auto-Deploy"**
3. Now every `git push` triggers automatic deployment

### Manual Deploy:

```powershell
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Go to Render dashboard
# Click "Manual Deploy" → "Deploy latest commit"
```

---

## 🐛 Troubleshooting

### Build fails with "npm ci" error

**Solution:** Check that `package-lock.json` is committed to GitHub

### Service is "Unhealthy"

**Check:**
1. MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
2. MONGODB_URI is correct (no typos)
3. View logs: Service → Logs tab

### "Application error" or 503

**Common causes:**
1. Service is sleeping (free tier) - Wait 30 seconds
2. Environment variables missing - Check Environment tab
3. MongoDB connection failed - Check logs

### Can't access /health endpoint

**Wait 2-3 minutes** after deployment starts. Health checks begin after services fully start.

---

## 📊 Monitoring

### View Logs:
- Go to service → **Logs** tab
- Shows real-time console output
- Look for `MongoDB connected successfully`

### View Metrics:
- Go to service → **Metrics** tab
- CPU, memory, response times

---

## 🔐 Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (already generated)
- [ ] Never commit `.env` files (already in .gitignore)
- [ ] Set up proper CORS in production
- [ ] Enable MongoDB Atlas IP whitelist (for production)
- [ ] Get proper SSL certificates (Render provides free SSL)

---

## 📚 Need More Help?

- **Detailed guide**: `docs/deployment/RENDER_DEPLOYMENT_GUIDE.md`
- **Environment variables**: `docs/deployment/RENDER_ENV_VARIABLES.md`
- **Render docs**: https://render.com/docs
- **Render community**: https://community.render.com

---

## 🎯 Quick Reference

```bash
# Your MongoDB Atlas connection
mongodb+srv://petbuddytestuser:G8mWGeeP8X4JVsPh@cluster0.nvpulaz.mongodb.net/petbudytest?retryWrites=true&w=majority&appName=Cluster0

# After deployment, your URLs:
Backend:  https://petbuddy-backend.onrender.com
Meta-Bot: https://petbuddy-meta-bot.onrender.com

# Test endpoints:
GET /health           - Health check
GET /api/auth/csrf    - CSRF token
GET /api/catalog/service-categories  - Service categories
```

---

**Ready to deploy? Start with Step 1! 🚀**
