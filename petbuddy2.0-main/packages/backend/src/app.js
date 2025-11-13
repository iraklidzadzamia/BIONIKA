import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { corsMiddleware } from './config/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import catalogRoutes from './routes/catalog.js';
import settingsRoutes from './routes/settings.js';
import messageRoutes from './routes/messages.js';
import setupRoutes from './routes/setup.js';
import companyRoutes from './routes/company.js';
import aiPromptRoutes from './routes/aiPrompts.js';
import locationRoutes from './routes/locations.js';
import googleRoutes from './routes/google.js';
import metaRoutes from './routes/meta.js';
import facebookRoutes from './routes/facebook.js';
import conversationRoutes from './routes/conversations.js';
import socketRoutes from './routes/socket.js';
import diagnosticsRoutes from './routes/diagnostics.js';
import internalRoutes from './routes/internal.js';
import { authenticateToken } from './middleware/auth.js';
import { requireRole } from './middleware/rbac.js';
import { ServiceItemController } from './controllers/serviceItemController.js';
import { generateToken as generateCsrfToken, doubleCsrfProtection } from './middleware/csrf.js';

const app = express();

// Trust the correct number of proxies (Cloudflare + Render)
// Using a numeric hop count avoids permissive 'true' and satisfies express-rate-limit
app.set('trust proxy', 2);

// Security middleware
app.use(helmet());

// CORS - must come before other middleware
app.use(corsMiddleware);

// Cookie parser - must come before routes
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL injection protection
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Potential NoSQL injection attempt: ${key}`, {
        ip: req.ip,
        path: req.path,
      });
    },
  })
);

// Logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: message => logger.info(message.trim()),
    },
  })
);

// CSRF protection is DISABLED for now
// Note: For JWT auth with httpOnly cookies + CORS + SameSite, CSRF risk is already minimal
// To enable CSRF protection in the future:
// 1. Uncomment the middleware below
// 2. Update frontend baseApi to fetch and include CSRF tokens in headers
// 3. Exempt public endpoints (health, login, register) from CSRF

// app.use((req, res, next) => {
//   // Exempt auth endpoints and GET requests from CSRF
//   if (req.path.startsWith('/api/v1/auth') || req.method === 'GET') {
//     return next();
//   }
//   doubleCsrfProtection(req, res, next);
// });

// CSRF token endpoint (for when CSRF is enabled)
// app.get('/api/v1/csrf-token', (req, res) => {
//   const token = generateCsrfToken(req, res);
//   res.json({ csrfToken: token });
// });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Diagnostics routes (for debugging - remove in production or add auth)
app.use('/api/v1/diagnostics', diagnosticsRoutes);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/ai-prompts', aiPromptRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/google', googleRoutes);
app.use('/api/v1/meta', metaRoutes);
app.use('/api/v1/facebook', facebookRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/socket', socketRoutes);
app.use('/api/v1/internal', internalRoutes);

// Backward-compatible aliases for service item update/delete
app.put('/api/v1/service-items/:id', authenticateToken, requireRole('manager'), (req, res) =>
  ServiceItemController.update(req, res)
);
app.delete('/api/v1/service-items/:id', authenticateToken, requireRole('manager'), (req, res) =>
  ServiceItemController.remove(req, res)
);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
