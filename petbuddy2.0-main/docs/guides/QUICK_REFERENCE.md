# ⚡ Quick Reference Card

**Keep this handy for daily development!**

---

## 🚀 Starting the Project

```bash
# First time setup
npm run setup

# Start everything
npm run dev

# Start individually
npm run dev:backend      # Port 3000
npm run dev:frontend     # Port 3001
npm run dev:meta-bot     # Port 3002
```

---

## 🗄️ Database

```bash
# Start MongoDB (Docker)
npm run docker:up

# Stop MongoDB
npm run docker:down

# View logs
npm run docker:logs

# Seed sample data
npm run seed
```

---

## 🌐 Access Points

| Service      | URL                          | Description     |
| ------------ | ---------------------------- | --------------- |
| Frontend     | http://localhost:3001        | Web application |
| Backend API  | http://localhost:3000        | REST API        |
| Health Check | http://localhost:3000/health | API status      |
| Meta Bot     | http://localhost:3002        | Chatbot service |
| MongoDB      | mongodb://localhost:27017    | Database        |

---

## 🛠️ Common Commands

```bash
# Development
make dev                # Start all services
make dev-backend        # Backend only
make dev-frontend       # Frontend only

# Database
make seed               # Add sample data
make docker-up          # Start MongoDB
make docker-down        # Stop MongoDB

# Utilities
make help               # Show all commands
make clean              # Clean node_modules
make test               # Run tests
make build              # Build for production
```

---

## 🐛 Quick Fixes

```bash
# Port already in use
lsof -ti:3000 | xargs kill

# Reinstall everything
make clean
npm run setup

# Restart MongoDB
npm run docker:down
npm run docker:up

# Kill all Node processes
pkill -f node
```

---

## 📁 Environment Files

```
packages/backend/.env         # Backend config
packages/frontend/.env.local  # Frontend config
packages/meta-bot/.env        # Meta-bot config
```

---

## 🔑 Essential Environment Variables

**Backend (.env):**

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/petbuddy
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3001
```

**Frontend (.env.local):**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

---

## 📚 Documentation Links

- **[Start Here](START_HERE.md)** - Complete startup guide
- **[Install Guide](INSTALL.md)** - Installation help
- **[Environment Setup](docs/environment-variables.md)** - Detailed config
- **[Deployment](docs/deployment/DEPLOY_NOW.md)** - Go live
- **[Troubleshooting](docs/deployment/troubleshooting.md)** - Fix issues

---

## 🎯 Typical Workflow

```bash
# 1. Morning startup
npm run docker:up          # Start MongoDB
npm run dev                # Start all services

# 2. During development
# Code changes auto-reload!
# Just save and refresh browser

# 3. End of day
# Ctrl+C to stop services
npm run docker:down        # Stop MongoDB (optional)
```

---

**Print this and keep it by your desk! 📌**
