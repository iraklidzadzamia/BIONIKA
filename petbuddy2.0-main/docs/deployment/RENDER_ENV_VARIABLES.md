# Render Environment Variables - Quick Reference

## 🚨 IMPORTANT: Add These Variables to Fix Deployment

Your deployment is failing because of missing environment variables. Follow this guide to fix it.

---

## 📋 Backend Service Variables

Go to: **Render Dashboard → petbuddy-backend → Environment**

Add these variables **one by one**:

```
JWT_ACCESS_SECRET
5687fe94dc85fc7a5e3a6a4fedd241942e06ac426dcf641ba60f7b5a9a4887f8df8ee6bb4fe52f20a9a90287d6d287aa5c96ad557daf96b40d69041db92d6472

JWT_REFRESH_SECRET
cbbc294ac7228ed7619f32c91f48616d4f6933af560f0bb1ffaee0580af59282ad49f1f10b4aa6d6f600b9e8a6c41949365f7d1c838927b0fa08f023cec7dd23

INTERNAL_SERVICE_API_KEY
50b931ae6a6cb50d83b1d558eaf9baa88d60eaf5da1b708198b37b4442147472

MONGODB_URI
[YOUR-MONGODB-ATLAS-CONNECTION-STRING]

FRONTEND_URL
http://localhost:3000

META_BOT_URL
https://petbuddy-meta-bot.onrender.com
```

**Replace `[YOUR-MONGODB-ATLAS-CONNECTION-STRING]`** with your actual MongoDB connection string!

---

## 📋 Meta-Bot Service Variables

Go to: **Render Dashboard → petbuddy-meta-bot → Environment**

Add these variables **one by one**:

```
MONGODB_URI
[YOUR-MONGODB-ATLAS-CONNECTION-STRING]

VERIFY_TOKEN
test_verify_token

PAGE_ACCESS_TOKEN
placeholder

APP_SECRET
placeholder

OPENAI_API_KEY
placeholder

BACKEND_API_URL
https://petbuddy-backend.onrender.com

JWT_ACCESS_SECRET
5687fe94dc85fc7a5e3a6a4fedd241942e06ac426dcf641ba60f7b5a9a4887f8df8ee6bb4fe52f20a9a90287d6d287aa5c96ad557daf96b40d69041db92d6472

JWT_REFRESH_SECRET
cbbc294ac7228ed7619f32c91f48616d4f6933af560f0bb1ffaee0580af59282ad49f1f10b4aa6d6f600b9e8a6c41949365f7d1c838927b0fa08f023cec7dd23

INTERNAL_SERVICE_API_KEY
50b931ae6a6cb50d83b1d558eaf9baa88d60eaf5da1b708198b37b4442147472

FRONTEND_URL
http://localhost:3000
```

**Replace `[YOUR-MONGODB-ATLAS-CONNECTION-STRING]`** with your actual MongoDB connection string!

---

## ✅ After Adding Variables

1. Click **"Save Changes"** in each service
2. Both services will automatically redeploy
3. Wait 5-8 minutes for deployment to complete
4. Check logs for any errors

---

## 🔍 Verify Deployment

Once deployed, test the endpoints:

**Backend:**
```bash
curl https://petbuddy-backend.onrender.com/health
```

**Meta-Bot:**
```bash
curl https://petbuddy-meta-bot.onrender.com/health
```

Both should return healthy status!

---

## 🆘 Still Having Issues?

1. **Check the logs** - Go to service → Logs tab
2. **Verify MongoDB connection string** - Make sure it's correct and network access is allowed (0.0.0.0/0)
3. **Check environment variables** - Make sure all required variables are set
4. **Redeploy manually** - Click "Manual Deploy" → "Deploy latest commit"

---

## 📝 Notes

- The placeholder values for Facebook/OpenAI are temporary
- You can update them later when you have real API keys
- Both services need the same JWT secrets and MongoDB URI
- Meta-bot needs backend variables because it imports backend code (temporary until Phase 2 refactoring)
