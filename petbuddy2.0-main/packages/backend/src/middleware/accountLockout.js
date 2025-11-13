import LoginAttempt from '../models/LoginAttempt.js';
import logger from '../utils/logger.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if account is locked due to failed login attempts
 */
export async function checkAccountLockout(req, res, next) {
  try {
    const { email } = req.body;
    const {ip} = req;

    if (!email) {
      return next();
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account is currently locked
    const recentAttempt = await LoginAttempt.findOne({
      email: normalizedEmail,
      lockedUntil: { $gt: new Date() },
    });

    if (recentAttempt) {
      const remainingMinutes = Math.ceil(
        (recentAttempt.lockedUntil.getTime() - Date.now()) / 60000
      );

      logger.warn('Login attempt on locked account', {
        email: normalizedEmail,
        ip,
        remainingMinutes,
      });

      return res.status(429).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
          lockedUntil: recentAttempt.lockedUntil,
        },
      });
    }

    // Count failed attempts in the last 15 minutes
    const cutoffTime = new Date(Date.now() - ATTEMPT_WINDOW_MS);
    const failedAttempts = await LoginAttempt.countDocuments({
      email: normalizedEmail,
      successful: false,
      createdAt: { $gte: cutoffTime },
    });

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);

      await LoginAttempt.create({
        email: normalizedEmail,
        ip,
        successful: false,
        lockedUntil,
      });

      logger.warn('Account locked due to failed login attempts', {
        email: normalizedEmail,
        ip,
        failedAttempts,
      });

      return res.status(429).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${Math.ceil(LOCKOUT_DURATION_MS / 60000)} minutes.`,
          lockedUntil,
        },
      });
    }

    // Store email and IP for tracking
    req.loginAttemptData = { email: normalizedEmail, ip };
    next();
  } catch (error) {
    logger.error('Account lockout check error:', error);
    // Don't block login on error, just log it
    next();
  }
}

/**
 * Record login attempt result
 */
export async function recordLoginAttempt(email, ip, successful) {
  try {
    await LoginAttempt.create({
      email: email.toLowerCase().trim(),
      ip,
      successful,
    });

    if (successful) {
      // Clear failed attempts on successful login
      const cutoffTime = new Date(Date.now() - ATTEMPT_WINDOW_MS);
      await LoginAttempt.deleteMany({
        email: email.toLowerCase().trim(),
        successful: false,
        createdAt: { $gte: cutoffTime },
      });
    }
  } catch (error) {
    logger.error('Failed to record login attempt:', error);
  }
}
