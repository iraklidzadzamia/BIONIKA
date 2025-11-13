# Quick Start Guide

## Your .env File is Ready! ✅

Located at: `docker/.env`

### What's Already Done

✅ **Security secrets auto-generated** (cryptographically secure)
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- INTERNAL_SERVICE_API_KEY

✅ **MongoDB credentials set**
- Username: `admin`
- Password: `petbuddy_mongo_2024_secure`

✅ **All ports configured**
- Backend: 3000
- Meta-Bot: 5001
- MongoDB: 27017

### What You Need to Add

#### Option 1: Start Without External Services (Recommended First)

Test the core system without Facebook/OpenAI:

1. **Comment out meta-bot** in `docker/docker-compose.yml`:
   ```yaml
   # Comment out or remove the meta-bot section (lines ~58-96)
   ```

2. **Start services**:
   ```bash
   cd docker
   docker-compose up mongodb backend
   ```

3. **Test backend**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"healthy"}
   ```

#### Option 2: Full Setup With All Services

Add these credentials to `docker/.env`:

**Facebook/Instagram (Required for bot):**
- `PAGE_ACCESS_TOKEN` - Get from [Facebook Developers](https://developers.facebook.com)
- `APP_SECRET` - From Facebook App Settings > Basic

**OpenAI (Required for AI features):**
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)

**Google Calendar (Optional):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

See `docker/ENV_SETUP_GUIDE.md` for detailed instructions.

## Installation Steps

### 1. Install Dependencies

```bash
# From root directory
npm install
```

This installs all packages using npm workspaces.

### 2. Start Services

**With Docker (Recommended):**
```bash
npm run docker:up
```

**Or manually:**
```bash
cd docker
docker-compose up -d
```

**Development mode (without Docker):**
```bash
npm run dev
```

### 3. Verify Services

**Check all services:**
```bash
# Backend
curl http://localhost:3000/health

# Meta-Bot (if running)
curl http://localhost:5001/health

# MongoDB
docker ps | grep mongodb
```

**View logs:**
```bash
npm run docker:logs
```

## Common Commands

### Development
```bash
npm run dev              # Start all services (dev mode)
npm run dev:backend      # Backend only
npm run dev:meta-bot     # Meta-bot only
npm run dev:frontend     # Frontend only
```

### Docker
```bash
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:logs      # View logs
npm run docker:build     # Rebuild images
```

### Database
```bash
npm run seed             # Seed database with sample data
```

## Access Points

- **Backend API**: http://localhost:3000
- **Meta Bot**: http://localhost:5001
- **Frontend** (if running): http://localhost:5173
- **MongoDB**: mongodb://localhost:27017

## Next Steps

1. ✅ Dependencies installed: `npm install`
2. ✅ Environment configured: `docker/.env`
3. ✅ Services started: `npm run docker:up`
4. 🔄 Add external credentials (Facebook, OpenAI)
5. 🔄 Test all endpoints
6. 🔄 Seed database with sample data

## Troubleshooting

### Port Already in Use
```bash
# Find what's using the port
netstat -ano | findstr :3000

# Or use different ports in .env
PORT=3001
```

### Cannot Connect to MongoDB
```bash
# Check if container is running
docker ps | grep mongodb

# Check logs
docker logs petbuddy-mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Missing Dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm install
```

## Development Workflow

1. **Make changes** to any package
2. **Changes auto-reload** (hot reload enabled)
3. **Test locally**
4. **Commit changes**

## Project Structure

```
petbuddy2.0/
├── docker/              # Docker & environment config
├── packages/
│   ├── shared/          # Shared models (9 models)
│   ├── backend/         # API service
│   ├── meta-bot/        # AI chatbot
│   └── frontend/        # Web app
└── scripts/             # Dev scripts
```

## Need Help?

- **Setup guide**: `docker/ENV_SETUP_GUIDE.md`
- **Structure guide**: `STRUCTURE.md`
- **Full documentation**: `README.md`

---

**Status**: ✅ Ready to develop!
**Next**: Add Facebook & OpenAI credentials, or start testing core features.
