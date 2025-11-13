import express from 'express';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

const router = express.Router();

/**
 * Diagnostic endpoint to check backend health and configuration
 * IMPORTANT: Remove or secure this endpoint in production!
 */
router.get('/status', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    // Check required environment variables
    const requiredEnvVars = {
      MONGODB_URI: !!config.mongodb.uri,
      JWT_ACCESS_SECRET: !!config.jwt.accessSecret,
      JWT_REFRESH_SECRET: !!config.jwt.refreshSecret,
      FRONTEND_URL: !!config.frontendUrl,
    };

    // Test MongoDB connection
    let dbPingSuccess = false;
    let dbError = null;
    try {
      if (mongoStatus === 1) {
        await mongoose.connection.db.admin().ping();
        dbPingSuccess = true;
      }
    } catch (error) {
      dbError = error.message;
    }

    const allEnvVarsSet = Object.values(requiredEnvVars).every(Boolean);

    res.json({
      status: allEnvVarsSet && mongoStatus === 1 && dbPingSuccess ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: {
        nodeEnv: config.nodeEnv,
        port: config.port,
      },
      database: {
        status: mongoStates[mongoStatus] || 'unknown',
        pingSuccess: dbPingSuccess,
        error: dbError,
        uri: config.mongodb.uri ? `${config.mongodb.uri.split('@')[1] || 'configured'}` : 'not set',
      },
      environmentVariables: requiredEnvVars,
      cors: {
        frontendUrl: config.frontendUrl || 'not set',
        originsCount: config.cors.origins ? config.cors.origins.length : 0,
        origins: config.cors.origins || [],
      },
      jwt: {
        accessTokenTtl: config.jwt.accessTokenTtl,
        refreshTokenTtl: config.jwt.refreshTokenTtl,
      },
      warnings: [
        ...(!allEnvVarsSet ? ['Missing required environment variables'] : []),
        ...(mongoStatus !== 1 ? ['Database not connected'] : []),
        ...(!dbPingSuccess ? ['Database ping failed'] : []),
      ],
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: config.nodeEnv === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * Test registration validation without saving to DB
 */
router.post('/test-registration', async (req, res) => {
  try {
    const { company, user } = req.body;

    const validationErrors = [];

    // Check required fields
    if (!company) validationErrors.push('company data is required');
    if (!user) validationErrors.push('user data is required');

    if (company) {
      if (!company.name) validationErrors.push('company.name is required');
      if (!company.email) validationErrors.push('company.email is required');
      if (!company.timezone) validationErrors.push('company.timezone is required');
    }

    if (user) {
      if (!user.email) validationErrors.push('user.email is required');
      if (!user.password) validationErrors.push('user.password is required');
      if (!user.fullName && (!user.firstName || !user.lastName)) {
        validationErrors.push('user.fullName or (firstName + lastName) is required');
      }
    }

    res.json({
      valid: validationErrors.length === 0,
      errors: validationErrors,
      receivedData: {
        company: company ? Object.keys(company) : [],
        user: user ? Object.keys(user) : [],
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: config.nodeEnv === 'development' ? error.stack : undefined,
    });
  }
});

export default router;
