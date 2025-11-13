# 🚀 One-Click Installation Guide

This guide provides the easiest ways to install and set up PetBuddy 2.0 on your machine.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **MongoDB** (optional) - Can use local installation or MongoDB Atlas
- **Git** - For cloning the repository

---

## 🎯 One-Click Installation Methods

### Method 1: NPM Script (Recommended for macOS/Linux)

Simply run:

```bash
npm run setup
```

This will:

- ✅ Check Node.js version
- ✅ Check MongoDB installation
- ✅ Install all dependencies for all packages
- ✅ Check environment configuration
- ✅ Display next steps

### Method 2: Makefile (Easiest)

If you prefer using `make` commands:

```bash
make setup
```

To see all available commands:

```bash
make help
```

### Method 3: Manual Script Execution

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Method 4: Windows Users

For Windows, use the existing PowerShell script:

```powershell
.\scripts\RUN_ME_FIRST.ps1
```

Or the batch file:

```cmd
.\scripts\RUN_ME_FIRST.bat
```

---

## 📦 What Gets Installed

The setup script installs dependencies for:

1. **Root workspace** - Monorepo tools (concurrently, etc.)
2. **Backend** (`packages/backend`) - Express.js API server
3. **Frontend** (`packages/frontend`) - Next.js web application
4. **Meta-bot** (`packages/meta-bot`) - Facebook/Instagram chatbot
5. **Shared** (`packages/shared`) - Shared utilities

---

## 🔧 After Installation

### 1. Set Up Environment Variables

Create `.env` files for each package:

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env.local

# Meta-bot
cp packages/meta-bot/.env.example packages/meta-bot/.env
```

See `docs/environment-variables.md` for detailed configuration.

### 2. Start MongoDB

**Option A: Local MongoDB**

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

**Option B: Docker**

```bash
npm run docker:up
```

**Option C: MongoDB Atlas** (Recommended for production)

- No local installation needed
- Update `MONGODB_URI` in your `.env` files

### 3. Start the Application

**All services:**

```bash
npm run dev
```

**Individual services:**

```bash
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:3001
npm run dev:meta-bot  # http://localhost:3002
```

### 4. Seed Database (Optional)

```bash
npm run seed
```

---

## 🎮 Quick Commands Reference

### Using NPM Scripts

```bash
npm run dev              # Start all services
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run dev:meta-bot     # Start meta-bot only
npm run seed             # Seed database
npm run docker:up        # Start MongoDB in Docker
npm run docker:down      # Stop MongoDB in Docker
```

### Using Makefile

```bash
make dev                 # Start all services
make dev-backend         # Start backend only
make dev-frontend        # Start frontend only
make dev-meta            # Start meta-bot only
make seed                # Seed database
make docker-up           # Start MongoDB in Docker
make docker-down         # Stop MongoDB in Docker
make clean               # Clean all node_modules
```

---

## 🐛 Troubleshooting

### "Node.js version error"

- Install Node.js 18 or higher from [nodejs.org](https://nodejs.org/)
- Check version: `node -v`

### "MongoDB not running"

- Start MongoDB: `brew services start mongodb-community` (macOS)
- Or use Docker: `npm run docker:up`
- Or use MongoDB Atlas (cloud)

### "npm install failed"

- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Run `npm run setup` again

### "Port already in use"

- Check what's running on ports 3000, 3001, 3002
- Kill the process: `lsof -ti:3000 | xargs kill` (macOS/Linux)
- Or change ports in `.env` files

### Permission errors (macOS/Linux)

- Make script executable: `chmod +x scripts/setup.sh`
- Or use: `npm run setup`

---

## 📚 Additional Resources

- [Quick Start Guide](docs/guides/QUICK_START.md)
- [Environment Variables](docs/environment-variables.md)
- [Deployment Guide](docs/deployment/DEPLOY_NOW.md)
- [Architecture](features/ARCHITECTURE.md)

---

## ✨ What's Next?

After installation:

1. ✅ Configure environment variables
2. ✅ Start MongoDB
3. ✅ Run `npm run dev`
4. ✅ Visit `http://localhost:3001`
5. ✅ Start building! 🎉

---

**Need Help?** Check the troubleshooting section or consult the documentation in the `docs/` directory.
