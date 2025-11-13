import { doubleCsrf } from 'csrf-csrf';
import { config } from '../config/env.js';

// Configure double submit cookie CSRF protection
const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => config.jwt.accessSecret, // Use existing JWT secret
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: config.env === 'production' ? 'none' : 'lax',
    path: '/',
    secure: config.env === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

export { generateToken, doubleCsrfProtection };
