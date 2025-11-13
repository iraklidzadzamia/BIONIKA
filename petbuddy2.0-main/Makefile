# PetBuddy 2.0 - Makefile for easy commands

.PHONY: help setup install dev start stop clean test seed docker-up docker-down

# Default target - show help
help:
	@echo "🐾 PetBuddy 2.0 - Available Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup        - One-click installation (install all dependencies)"
	@echo "  make install      - Install all dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start all services in development mode"
	@echo "  make dev-backend  - Start only backend"
	@echo "  make dev-frontend - Start only frontend"
	@echo "  make dev-meta     - Start only meta-bot"
	@echo ""
	@echo "Production:"
	@echo "  make start        - Start backend & meta-bot in production mode"
	@echo "  make build        - Build frontend for production"
	@echo ""
	@echo "Database:"
	@echo "  make seed         - Seed database with sample data"
	@echo "  make docker-up    - Start MongoDB in Docker"
	@echo "  make docker-down  - Stop MongoDB Docker container"
	@echo ""
	@echo "Utilities:"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean node_modules and caches"
	@echo "  make logs         - Show Docker logs"
	@echo ""

# One-click setup
setup:
	@chmod +x scripts/setup.sh
	@./scripts/setup.sh

# Install dependencies
install:
	@echo "Installing all dependencies..."
	@npm install

# Development commands
dev:
	@npm run dev

dev-backend:
	@npm run dev:backend

dev-frontend:
	@npm run dev:frontend

dev-meta:
	@npm run dev:meta-bot

# Production commands
start:
	@npm run start

build:
	@npm run build

# Database commands
seed:
	@npm run seed

# Docker commands
docker-up:
	@npm run docker:up

docker-down:
	@npm run docker:down

logs:
	@npm run docker:logs

# Test command
test:
	@npm run test

# Clean command
clean:
	@echo "Cleaning node_modules and caches..."
	@rm -rf node_modules
	@rm -rf packages/*/node_modules
	@rm -rf packages/*/.next
	@rm -rf packages/*/dist
	@echo "Clean complete!"

