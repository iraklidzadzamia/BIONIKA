import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the meta-bot root (one level up from config/)
dotenv.config({ path: join(__dirname, "../.env") });

/**
 * Validates required environment variables
 * @param {string} varName - Name of the environment variable
 * @param {*} value - Value of the environment variable
 * @param {string} description - Description for error message
 */
function validateRequired(varName, value, description) {
  if (!value) {
    throw new Error(`${varName} is required: ${description}`);
  }
  return value;
}

/**
 * Validates string minimum length
 */
function validateMinLength(varName, value, minLength) {
  if (value && value.length < minLength) {
    throw new Error(`${varName} must be at least ${minLength} characters long`);
  }
  return value;
}

/**
 * Validates URL format
 */
function validateUrl(varName, value, required = false) {
  if (!value) {
    if (required) {
      throw new Error(`${varName} is required and must be a valid URL`);
    }
    return value;
  }

  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(value)) {
    throw new Error(`${varName} must be a valid HTTP/HTTPS URL (got: ${value})`);
  }

  return value;
}

/**
 * Validates port number
 */
function validatePort(varName, value) {
  const port = Number(value);

  if (isNaN(port)) {
    throw new Error(`${varName} must be a valid number (got: ${value})`);
  }

  if (port < 1 || port > 65535) {
    throw new Error(`${varName} must be between 1 and 65535 (got: ${port})`);
  }

  return port;
}

// Extract and validate environment variables
const env = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || "development",
  META_BOT_PORT: validatePort(
    "META_BOT_PORT",
    process.env.META_BOT_PORT || "5001"
  ),

  // Database
  MONGODB_URI: validateRequired(
    "MONGODB_URI",
    process.env.MONGODB_URI_DOCKER || process.env.MONGODB_URI,
    "MongoDB connection string"
  ),

  // Backend Integration
  BACKEND_API_URL: validateUrl(
    "BACKEND_API_URL",
    process.env.BACKEND_API_URL ||
      process.env.BASE_URL ||
      "http://localhost:3000",
    false // Optional in dev, defaults to localhost
  ),
  OUTBOUND_SERVER_URL: validateUrl(
    "OUTBOUND_SERVER_URL",
    process.env.OUTBOUND_SERVER_URL,
    false // Optional
  ),

  // Security
  INTERNAL_SERVICE_API_KEY: validateMinLength(
    "INTERNAL_SERVICE_API_KEY",
    validateRequired(
      "INTERNAL_SERVICE_API_KEY",
      process.env.INTERNAL_SERVICE_API_KEY,
      "Internal service API key for backend communication"
    ),
    32
  ),
  VERIFY_TOKEN: validateRequired(
    "VERIFY_TOKEN",
    process.env.VERIFY_TOKEN,
    "Facebook/Instagram webhook verification token"
  ),

  // JWT Configuration (for token verification)
  JWT_ACCESS_SECRET: validateMinLength(
    "JWT_ACCESS_SECRET",
    process.env.JWT_ACCESS_SECRET,
    32 // Minimum 32 characters for JWT secrets
  ),
  JWT_REFRESH_SECRET: validateMinLength(
    "JWT_REFRESH_SECRET",
    process.env.JWT_REFRESH_SECRET,
    32 // Minimum 32 characters for JWT secrets
  ),

  // Facebook/Instagram Integration
  FB_PAGE_ACCESS_TOKEN:
    process.env.FB_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN,
  INSTA_PAGE_ACCESS_TOKEN: process.env.INSTA_PAGE_ACCESS_TOKEN,
  APP_SECRET: process.env.APP_SECRET,
  ADMIN_PAGE_ACCESS_TOKEN: process.env.ADMIN_PAGE_ACCESS_TOKEN,
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
  ADMIN_INSTAGRAM_ACCESS_TOKEN: process.env.ADMIN_INSTAGRAM_ACCESS_TOKEN,
  ADMIN_INSTAGRAM_CHAT_ID: process.env.ADMIN_INSTAGRAM_CHAT_ID,

  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CHAT_MODEL: process.env.CHAT_MODEL || "gpt-4o",
  IMAGE_MODEL: process.env.IMAGE_MODEL || "gpt-4o",

  // Gemini Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro",
  GEMINI_VISION_MODEL: process.env.GEMINI_VISION_MODEL || "gemini-1.5-pro-vision",
  GEMINI_API_VERSION: process.env.GEMINI_API_VERSION,

  // Bot Configuration
  RESPONSE_DELAY_MS: Number(process.env.RESPONSE_DELAY_MS) || 4000,
  SYSTEM_INSTRUCTIONS: process.env.SYSTEM_INSTRUCTIONS,

  // Feature Flags
  USE_LANGGRAPH: process.env.USE_LANGGRAPH === "true",
  USE_GEMINI: process.env.USE_GEMINI === "true",
  ENFORCE_TOOL_USAGE: process.env.ENFORCE_TOOL_USAGE !== "false", // Default to true for hybrid mode reliability
};

export const config = {
  // Server
  env: env.NODE_ENV,
  port: env.META_BOT_PORT,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",
  isTest: env.NODE_ENV === "test",

  // Database
  mongodb: {
    uri: env.MONGODB_URI,
  },

  // Backend Integration
  backend: {
    apiUrl: env.BACKEND_API_URL,
    outboundServerUrl: env.OUTBOUND_SERVER_URL,
  },

  // Security
  security: {
    internalApiKey: env.INTERNAL_SERVICE_API_KEY,
    verifyToken: env.VERIFY_TOKEN,
  },

  // JWT (for token verification)
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
  },

  // Facebook/Instagram
  facebook: {
    pageAccessToken: env.FB_PAGE_ACCESS_TOKEN,
    appSecret: env.APP_SECRET,
    adminPageAccessToken: env.ADMIN_PAGE_ACCESS_TOKEN,
    adminChatId: env.ADMIN_CHAT_ID,
  },

  instagram: {
    pageAccessToken: env.INSTA_PAGE_ACCESS_TOKEN || env.FB_PAGE_ACCESS_TOKEN,
    adminAccessToken: env.ADMIN_INSTAGRAM_ACCESS_TOKEN,
    adminChatId: env.ADMIN_INSTAGRAM_CHAT_ID,
  },

  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.CHAT_MODEL,
    imageModel: env.IMAGE_MODEL,
  },

  // Gemini
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    chatModel: env.GEMINI_CHAT_MODEL,
    visionModel: env.GEMINI_VISION_MODEL,
    apiVersion: env.GEMINI_API_VERSION,
  },

  // Bot Behavior
  bot: {
    responseDelayMs: env.RESPONSE_DELAY_MS,
    systemInstructions: env.SYSTEM_INSTRUCTIONS,
  },

  // Feature Flags
  features: {
    useLangGraph: env.USE_LANGGRAPH,
    useGemini: env.USE_GEMINI,
    enforceToolUsage: env.ENFORCE_TOOL_USAGE, // Hybrid mode: force OpenAI when Gemini misses tools
  },
};

// Log configuration on startup (hide sensitive values)
if (config.isDevelopment) {
  console.log("📋 Meta-Bot Configuration Loaded:");
  console.log("  - Environment:", config.env);
  console.log("  - Port:", config.port);
  console.log(
    "  - MongoDB:",
    config.mongodb.uri ? "✅ Configured" : "❌ Missing"
  );
  console.log("  - Backend URL:", config.backend.apiUrl);
  console.log(
    "  - Verify Token:",
    config.security.verifyToken ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  - Internal API Key:",
    config.security.internalApiKey ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  - Facebook Token:",
    config.facebook.pageAccessToken ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  - Instagram Token:",
    config.instagram.pageAccessToken ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  - OpenAI API Key:",
    config.openai.apiKey ? "✅ Set" : "❌ Missing"
  );
  console.log("  - Chat Model:", config.openai.chatModel);
  console.log(
    "  - Gemini API Key:",
    config.gemini.apiKey ? "✅ Set" : "❌ Missing"
  );
  console.log("  - Gemini Model:", config.gemini.chatModel);
  console.log("  - Response Delay:", config.bot.responseDelayMs + "ms");
  console.log(
    "  - LangGraph:",
    config.features.useLangGraph ? "✅ Enabled" : "❌ Disabled (Legacy)"
  );
  console.log(
    "  - AI Provider:",
    config.features.useGemini ? "🤖 Gemini" : "🤖 OpenAI"
  );
  console.log(
    "  - Enforce Tool Usage:",
    config.features.enforceToolUsage ? "✅ Enabled" : "❌ Disabled"
  );
}
