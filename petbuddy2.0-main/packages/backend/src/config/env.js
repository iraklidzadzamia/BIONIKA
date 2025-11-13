import dotenv from 'dotenv';
import Joi from 'joi';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root (one level up from src/config/)
dotenv.config({ path: join(__dirname, '../../.env') });

const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(4000),

  // Database
  MONGODB_URI: Joi.string().required(),

  // JWT Configuration
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL: Joi.string().default('7d'),

  // Frontend/CORS Configuration
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Security
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  INTERNAL_SERVICE_API_KEY: Joi.string().min(32).required(),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  // Facebook Integration
  FACEBOOK_APP_ID: Joi.string().optional(),
  FACEBOOK_APP_SECRET: Joi.string().optional(),
  FACEBOOK_GRAPH_VERSION: Joi.string().default('v18.0'),
  FACEBOOK_SCOPES: Joi.string().optional(),

  // Google Calendar Integration
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_REDIRECT_URI: Joi.string().uri().optional(),

  // Meta Bot Service
  META_BOT_BASE_URL: Joi.string().uri().default('http://localhost:5001'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  // Server
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',

  // Frontend URL - Single source of truth
  frontendUrl: envVars.FRONTEND_URL,

  // Database
  mongodb: {
    uri: envVars.MONGODB_URI,
  },

  // JWT
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessTokenTtl: envVars.ACCESS_TOKEN_TTL,
    refreshTokenTtl: envVars.REFRESH_TOKEN_TTL,
  },

  // CORS
  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map(origin => origin.trim()),
    frontendUrl: envVars.FRONTEND_URL, // Convenience duplicate for CORS config
  },

  // Security
  bcrypt: {
    saltRounds: envVars.BCRYPT_SALT_ROUNDS,
  },
  internalServiceApiKey: envVars.INTERNAL_SERVICE_API_KEY,

  // Cookie settings (derived from NODE_ENV)
  cookie: {
    secure: envVars.NODE_ENV === 'production',
    sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
  },

  // Logging
  log: {
    level: envVars.LOG_LEVEL,
  },

  // Facebook Integration
  facebook: {
    appId: envVars.FACEBOOK_APP_ID,
    appSecret: envVars.FACEBOOK_APP_SECRET,
    graphVersion: envVars.FACEBOOK_GRAPH_VERSION,
    scopes: envVars.FACEBOOK_SCOPES,
  },

  // Google Calendar Integration
  google: {
    clientId: envVars.GOOGLE_CLIENT_ID,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    redirectUri: envVars.GOOGLE_REDIRECT_URI,
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  },

  // Meta Bot Service
  metaBot: {
    baseUrl: envVars.META_BOT_BASE_URL,
  },
};
