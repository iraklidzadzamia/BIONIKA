# Meta-Bot Logging Guide

## Overview

The meta-bot server now includes comprehensive logging for message flow tracking, LLM interactions, tool executions, and error handling. Logs are written to files and displayed in the console for real-time monitoring.

## Log Files

Logs are stored in the `packages/meta-bot/logs/` directory:

- **`combined.log`** - All logs (info, warn, error, debug)
- **`error.log`** - Error logs only
- **`message-flow.log`** - Message flow logs only (inbound/outbound messages)

## Log Levels

- **ERROR** - Errors that need attention
- **WARN** - Warnings about potential issues
- **INFO** - General information (message flow, LLM calls, tool executions)
- **DEBUG** - Detailed debugging information

## Log Structure

Each log entry includes:

- Timestamp
- Log level
- Platform (facebook/instagram)
- Action/operation being performed
- Message direction (inbound/outbound) for messages
- Message ID, Sender ID, Recipient ID
- Additional metadata

## What Gets Logged

### 1. Message Flow

- **Incoming messages**: When a message is received from Facebook/Instagram
- **Outgoing messages**: When a message is sent to a customer
- **Message saving**: When messages are saved to the database
- **Duplicate detection**: When duplicate messages are detected and skipped

### 2. LLM Interactions

- **LLM requests**: When creating a chat with tools
- **LLM responses**: When receiving responses from OpenAI
- **Follow-up requests**: When creating follow-up messages with tool results
- **Error handling**: When LLM calls fail

### 3. Tool Executions

- **Tool calls**: When a tool is called with parameters
- **Tool completions**: When a tool execution completes successfully
- **Tool errors**: When a tool execution fails

### 4. Buffering

- **Buffered processing**: When processing buffered conversations
- **Buffer cleanup**: When cleaning up conversation buffers

### 5. Errors

- **Send errors**: When message sending fails
- **Token errors**: When access tokens expire or are invalid
- **Rate limiting**: When rate limits are hit
- **General errors**: Any other errors in the processing flow

## Viewing Logs

### Real-time Console Logs

When running in development mode, logs are displayed in the console with colors:

- ✅ Green for info
- ⚠️ Yellow for warnings
- ❌ Red for errors

### View Log Files

```bash
# View all logs
tail -f packages/meta-bot/logs/combined.log

# View error logs only
tail -f packages/meta-bot/logs/error.log

# View message flow logs
tail -f packages/meta-bot/logs/message-flow.log

# Search for specific sender
grep "Sender: <sender_id>" packages/meta-bot/logs/message-flow.log

# Search for specific message ID
grep "MsgID: <message_id>" packages/meta-bot/logs/message-flow.log
```

### View Logs in Docker

```bash
# View all meta-bot logs
docker-compose logs -f petbuddy-meta-bot

# View last 100 lines
docker-compose logs --tail=100 petbuddy-meta-bot

# View logs with timestamps
docker-compose logs -f --timestamps petbuddy-meta-bot
```

## Example Log Entries

### Incoming Message

```
2024-01-15 10:30:45 [INFO] [facebook] [inbound] [MsgID: mid_abc123] [Sender: 123456789] [Recipient: 987654321] Received message {"has_text":true,"text_length":25,"attachments_count":0}
```

### LLM Request

```
2024-01-15 10:30:46 [INFO] [facebook] [llm-request] [Sender: 123456789] Creating chat with 5 messages {"tool_choice":"auto","has_name":true,"has_phone":true}
```

### Tool Execution

```
2024-01-15 10:30:47 [INFO] [facebook] [tool-book_appointment-called] [Sender: 123456789] Executing tool with parameters {"parameters":"{\"date\":\"2024-01-20\",\"time\":\"10:00\"}"}
```

### Outgoing Message

```
2024-01-15 10:30:48 [INFO] [facebook] [outbound] [MsgID: mid_def456] [Sender: 123456789] [Recipient: 123456789] Message sent successfully {"message_length":45}
```

### Error

```
2024-01-15 10:30:49 [ERROR] [facebook] [send-message] [Sender: 123456789] Error in send-message: Rate limit exceeded {"recipient_id":"123456789","error":"Rate limit exceeded"}
```

## Log Rotation

For production environments, consider setting up log rotation to prevent log files from growing too large. You can use tools like `logrotate` on Linux or configure Winston's max file size.

## Performance Considerations

- Logs are written asynchronously and won't block message processing
- JSON format logs are compact and efficient
- Console output is only enabled in development mode

## Troubleshooting

### Logs Not Appearing

1. Check that the `logs/` directory exists and is writable
2. Verify Winston is installed: `npm list winston`
3. Check file permissions: `ls -la packages/meta-bot/logs/`

### Too Many Logs

If logs are too verbose, you can adjust the log level in the logger configuration:

- In `packages/meta-bot/utils/logger.js`, change the `level` property

### Missing Information

If you need additional logging, you can:

1. Add custom log entries using `logger.messageFlow.processing()`
2. Use `logger.info()`, `logger.error()`, etc. for general logging
3. Add metadata to existing log calls

## Best Practices

1. **Use structured logging**: Always include relevant IDs and metadata
2. **Log at appropriate levels**: Use ERROR for errors, INFO for normal flow, DEBUG for detailed debugging
3. **Include context**: Always include sender ID, message ID, and platform in logs
4. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII
5. **Monitor error logs**: Set up alerts for ERROR level logs in production
