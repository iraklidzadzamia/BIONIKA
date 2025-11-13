## How to Fix the MongoDB Connection Issue in `meta-bot`

### The Problem

The `meta-bot` service experiences intermittent `querySrv ENOTFOUND` errors when running via `docker-compose`. This happens because the service is trying to connect to a MongoDB Atlas cluster (a cloud database) from within a Docker container, and it's facing DNS resolution issues.

The `docker-compose.yml` file is designed to spin up a self-contained environment, including a local MongoDB service. The `meta-bot` should be connecting to this local database, not an external one, when running inside Docker.

### The Solution

To fix this, we need to ensure the `meta-bot` service defaults to the local MongoDB container provided in the `docker-compose.yml` setup.

1.  **Isolate Docker's MongoDB URI:** In `docker/docker-compose.yml`, the `MONGODB_URI` for the `meta-bot` service is set to use the local `mongodb` container.

2.  **Prioritize Local URI in Code:** The application's configuration (`packages/meta-bot/config/env.js`) will be updated to prioritize a new `MONGODB_URI_DOCKER` environment variable. If this variable is present, it will be used; otherwise, the application will fall back to the existing `MONGODB_URI` (intended for production/non-Docker environments).

This change directs the `meta-bot` to use the correct database depending on the environment it's running in, resolving the connection errors.
