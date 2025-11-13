/**
 * Centralized Environment Configuration for Frontend
 *
 * All environment variables are accessed through this config object.
 * This provides:
 * - Single source of truth
 * - Type safety through JSDoc
 * - Clear defaults
 * - Easy testing and mocking
 *
 * Note: In Next.js, only variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
 */

// Helper to get boolean from env
const getBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  return value === 'true' || value === '1';
};

export const env = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // App Info
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'PetBuddy',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0',

  // Port Configuration
  port: process.env.PORT || process.env.NEXT_PUBLIC_PORT || 3000,

  // Backend Configuration - Single source of truth
  backendOrigin: process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:4000',

  // API Configuration - Derived from backend
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1',
  // In production with rewrites: use relative path
  // In development: use full backend URL
  get apiUrl() {
    // Allow override if explicitly set
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    // Otherwise derive from backend origin
    return this.backendOrigin;
  },

  // Socket Configuration - Derived from backend
  get socketUrl() {
    // Allow override if explicitly set
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    // Otherwise derive from backend origin
    return this.backendOrigin;
  },

  // Facebook Integration
  facebookAppId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',

  // Feature Flags
  enableNewUI: getBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_NEW_UI, false),
  enableAIAssist: getBooleanEnv(process.env.NEXT_PUBLIC_ENABLE_AI_ASSIST, false),
};

// Helper functions for common checks
export const config = {
  ...env,

  // API helpers
  getApiUrl: (path = '') => {
    const base = env.apiUrl;
    return path ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : base;
  },

  getBackendUrl: (path = '') => {
    const base = env.backendOrigin;
    return path ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : base;
  },

  // Environment checks
  isProd: env.isProduction,
  isDev: env.isDevelopment,
};

// Log configuration in development (browser only)
if (typeof window !== 'undefined' && config.isDevelopment) {
  console.log('📋 Frontend Configuration Loaded:');
  console.log('  - Environment:', config.nodeEnv);
  console.log('  - Port:', config.port);
  console.log('  - App Name:', config.appName);
  console.log('  - App Version:', config.appVersion);
  console.log('  - API URL:', config.apiUrl);
  console.log('  - Backend Origin:', config.backendOrigin);
  console.log('  - Socket URL:', config.socketUrl || '(auto-detect)');
  console.log('  - Facebook App ID:', config.facebookAppId ? '✅ Set' : '❌ Missing');
  console.log('  - New UI Enabled:', config.enableNewUI);
  console.log('  - AI Assist Enabled:', config.enableAIAssist);
}

export default config;
