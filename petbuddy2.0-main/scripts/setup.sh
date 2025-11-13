#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}PetBuddy 2.0 - One-Click Installation${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Step 1: Check Node.js version
echo -e "${YELLOW}Step 1: Checking Node.js version...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}[OK] Node.js $(node -v) is installed${NC}"
    else
        echo -e "${RED}[ERROR] Node.js version 18+ required. Current: $(node -v)${NC}"
        exit 1
    fi
else
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo ""

# Step 2: Check MongoDB (optional - can use MongoDB Atlas)
echo -e "${YELLOW}Step 2: Checking MongoDB...${NC}"
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}[OK] MongoDB is installed${NC}"
    
    # Check if MongoDB is running
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}[OK] MongoDB is running${NC}"
    else
        echo -e "${YELLOW}[INFO] MongoDB is not running${NC}"
        echo -e "${YELLOW}[INFO] You can start it with: brew services start mongodb-community${NC}"
        echo -e "${YELLOW}[INFO] Or use MongoDB Atlas (cloud database)${NC}"
    fi
else
    echo -e "${YELLOW}[WARNING] MongoDB not found locally${NC}"
    echo -e "${YELLOW}[INFO] You can install it with: brew install mongodb-community${NC}"
    echo -e "${YELLOW}[INFO] Or use MongoDB Atlas (recommended for cloud deployment)${NC}"
fi
echo ""

# Step 3: Install all dependencies
echo -e "${YELLOW}Step 3: Installing all dependencies...${NC}"
echo -e "${YELLOW}This may take 2-3 minutes...${NC}"
echo ""

npm install

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}[OK] All dependencies installed successfully!${NC}"
else
    echo ""
    echo -e "${RED}[ERROR] npm install failed!${NC}"
    echo "Please check the error messages above"
    exit 1
fi
echo ""

# Step 4: Check for .env files
echo -e "${YELLOW}Step 4: Checking environment configuration...${NC}"

MISSING_ENV=false

if [ ! -f "packages/backend/.env" ]; then
    echo -e "${YELLOW}[WARNING] Backend .env file not found${NC}"
    MISSING_ENV=true
fi

if [ ! -f "packages/frontend/.env.local" ]; then
    echo -e "${YELLOW}[WARNING] Frontend .env.local file not found${NC}"
    MISSING_ENV=true
fi

if [ ! -f "packages/meta-bot/.env" ]; then
    echo -e "${YELLOW}[WARNING] Meta-bot .env file not found${NC}"
    MISSING_ENV=true
fi

if [ "$MISSING_ENV" = true ]; then
    echo ""
    echo -e "${YELLOW}[INFO] You'll need to set up environment variables${NC}"
    echo -e "${YELLOW}[INFO] See docs/environment-variables.md for details${NC}"
else
    echo -e "${GREEN}[OK] Environment files found${NC}"
fi
echo ""

# Complete
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}INSTALLATION COMPLETE! 🎉${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "${YELLOW}Quick Start Commands:${NC}"
echo ""
echo -e "${CYAN}1. Start all services (development):${NC}"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo -e "${CYAN}2. Start individual services:${NC}"
echo -e "   ${GREEN}npm run dev:backend${NC}   # Backend API (port 3000)"
echo -e "   ${GREEN}npm run dev:frontend${NC}  # Frontend (port 3001)"
echo -e "   ${GREEN}npm run dev:meta-bot${NC}  # Meta bot (port 3002)"
echo ""
echo -e "${CYAN}3. Start MongoDB with Docker:${NC}"
echo -e "   ${GREEN}npm run docker:up${NC}"
echo ""
echo -e "${CYAN}4. Seed database (optional):${NC}"
echo -e "   ${GREEN}npm run seed${NC}"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo -e "   - Quick Start: ${CYAN}docs/guides/QUICK_START.md${NC}"
echo -e "   - Environment Setup: ${CYAN}docs/environment-variables.md${NC}"
echo -e "   - Deployment: ${CYAN}docs/deployment/DEPLOY_NOW.md${NC}"
echo ""

