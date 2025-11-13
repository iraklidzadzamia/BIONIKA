import winston from "winston";
import { config } from "../config/env.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, "../logs");
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format for message flow logs
const messageFlowFormat = winston.format.printf(
  ({
    timestamp,
    level,
    message,
    platform,
    messageId,
    senderId,
    recipientId,
    direction,
    action,
    ...metadata
  }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]`;

    if (platform) logMessage += ` [${platform}]`;
    if (action) logMessage += ` [${action}]`;
    if (direction) logMessage += ` [${direction}]`;
    if (messageId) logMessage += ` [MsgID: ${messageId}]`;
    if (senderId) logMessage += ` [Sender: ${senderId}]`;
    if (recipientId) logMessage += ` [Recipient: ${recipientId}]`;

    logMessage += ` ${message}`;

    // Add any additional metadata
    if (Object.keys(metadata).length > 0) {
      logMessage += ` ${JSON.stringify(metadata)}`;
    }

    return logMessage;
  }
);

const logger = winston.createLogger({
  level: config.isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "petbuddy-meta-bot" },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    // Combined log file (all logs)
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    // Message flow log file (messages only)
    new winston.transports.File({
      filename: "logs/message-flow.log",
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        messageFlowFormat
      ),
    }),
  ],
});

// Console transport with colored output
if (!config.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(
          ({
            timestamp,
            level,
            message,
            platform,
            messageId,
            senderId,
            recipientId,
            direction,
            action,
            ...metadata
          }) => {
            let logMessage = `${timestamp} ${level}`;

            if (platform) logMessage += ` [${platform}]`;
            if (action) logMessage += ` [${action}]`;
            if (direction) logMessage += ` [${direction}]`;
            if (messageId) logMessage += ` [MsgID: ${messageId}]`;
            if (senderId) logMessage += ` [Sender: ${senderId}]`;
            if (recipientId) logMessage += ` [Recipient: ${recipientId}]`;

            logMessage += ` ${message}`;

            // Add any additional metadata (condensed)
            if (Object.keys(metadata).length > 0) {
              const condensedMeta = Object.keys(metadata).reduce((acc, key) => {
                acc[key] =
                  typeof metadata[key] === "string" &&
                  metadata[key].length > 100
                    ? metadata[key].substring(0, 100) + "..."
                    : metadata[key];
                return acc;
              }, {});
              logMessage += ` ${JSON.stringify(condensedMeta)}`;
            }

            return logMessage;
          }
        )
      ),
    })
  );
}

// Helper methods for structured logging
logger.messageFlow = {
  incoming: (
    platform,
    messageId,
    senderId,
    recipientId,
    message,
    metadata = {}
  ) => {
    logger.info(message, {
      platform,
      messageId,
      senderId,
      recipientId,
      direction: "inbound",
      action: "message-received",
      ...metadata,
    });
  },

  outgoing: (
    platform,
    messageId,
    senderId,
    recipientId,
    message,
    metadata = {}
  ) => {
    logger.info(message, {
      platform,
      messageId,
      senderId,
      recipientId,
      direction: "outbound",
      action: "message-sent",
      ...metadata,
    });
  },

  processing: (
    platform,
    messageId,
    senderId,
    action,
    details,
    metadata = {}
  ) => {
    logger.info(`Processing: ${details}`, {
      platform,
      messageId,
      senderId,
      action,
      ...metadata,
    });
  },

  llm: (platform, senderId, action, details, metadata = {}) => {
    logger.info(`LLM ${action}: ${details}`, {
      platform,
      senderId,
      action: `llm-${action}`,
      ...metadata,
    });
  },

  tool: (platform, senderId, toolName, action, details, metadata = {}) => {
    logger.info(`Tool ${toolName} ${action}: ${details}`, {
      platform,
      senderId,
      action: `tool-${toolName}-${action}`,
      toolName,
      ...metadata,
    });
  },

  error: (platform, senderId, action, error, metadata = {}) => {
    logger.error(`Error in ${action}: ${error.message}`, {
      platform,
      senderId,
      action,
      error: error.message,
      stack: error.stack,
      ...metadata,
    });
  },

  warning: (platform, messageId, senderId, action, details, metadata = {}) => {
    logger.warn(`Warning: ${details}`, {
      platform,
      messageId,
      senderId,
      action,
      ...metadata,
    });
  },

  info: (platform, senderId, action, details, metadata = {}) => {
    logger.info(details, {
      platform,
      senderId,
      action,
      ...metadata,
    });
  },
};

export default logger;
