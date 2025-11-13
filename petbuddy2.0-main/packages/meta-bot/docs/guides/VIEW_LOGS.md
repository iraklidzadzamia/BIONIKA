# How to View Meta-Bot Logs

## Quick Commands

### Method 1: Docker Compose (Recommended)

```bash
# Live logs (follow mode)
docker-compose -f docker/docker-compose.yml logs -f meta-bot

# Last 100 lines then follow
docker-compose -f docker/docker-compose.yml logs --tail=100 -f meta-bot

# All logs with timestamps
docker-compose -f docker/docker-compose.yml logs -f --timestamps meta-bot
```

### Method 2: Docker Direct

```bash
# Live logs
docker logs -f petbuddy-meta-bot

# Last 50 lines then follow
docker logs --tail=50 -f petbuddy-meta-bot
```

### Method 3: Log Files (After logging is implemented)

```bash
# View all logs
tail -f packages/meta-bot/logs/combined.log

# View message flow only
tail -f packages/meta-bot/logs/message-flow.log

# View errors only
tail -f packages/meta-bot/logs/error.log
```

## Filtering Logs

### Search for specific text

```bash
docker logs petbuddy-meta-bot | grep "facebook"
docker logs petbuddy-meta-bot | grep "ERROR"
```

### Filter by time

```bash
# Logs from last hour
docker logs --since 1h petbuddy-meta-bot

# Logs from specific time
docker logs --since "2024-01-15T10:00:00" petbuddy-meta-bot
```

## Viewing Multiple Services

```bash
# View all services
docker-compose -f docker/docker-compose.yml logs -f

# View specific services
docker-compose -f docker/docker-compose.yml logs -f meta-bot backend
```

## Tips

1. **Live monitoring**: Use `-f` flag to follow logs in real-time
2. **Scroll history**: Remove `-f` to see historical logs
3. **Limit output**: Use `--tail=100` to see only recent logs
4. **Exit**: Press `Ctrl+C` to stop following logs
5. **Background**: Run in a separate terminal window to keep monitoring

## What to Look For

- **Message Flow**: Look for "[inbound]" and "[outbound]" messages
- **LLM Calls**: Look for "LLM request" and "LLM response"
- **Tool Executions**: Look for "Tool [name] called" and "Tool [name] completed"
- **Errors**: Look for "ERROR" level logs or "[ERROR]" prefix
- **Facebook/Instagram**: Look for "[facebook]" or "[instagram]" tags
