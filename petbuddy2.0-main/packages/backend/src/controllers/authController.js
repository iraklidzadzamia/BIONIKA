import { AuthService } from '../services/authService.js';
import logger from '../utils/logger.js';
import { recordLoginAttempt } from '../middleware/accountLockout.js';
import { Company } from '@petbuddy/shared';
import { config } from '../config/env.js';

export class AuthController {
  /**
   * Register first manager for a company
   */
  static async registerManager(req, res) {
    try {
      const { company, user } = req.body;

      // Validate required fields
      if (!company || !user) {
        return res.status(400).json({
          error: {
            code: 'MISSING_DATA',
            message: 'Company and user data are required',
          },
        });
      }

      const result = await AuthService.registerManager(company, user);

      // Auto-login: Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Get full company data for Redux
      const fullCompany = await Company.findById(result.company._id);

      res.status(201).json({
        message: 'Company and manager registered successfully',
        user: result.user,
        accessToken: result.accessToken,
        tokenExpiry: result.tokenExpiry,
        company: fullCompany,
      });
    } catch (error) {
      logger.error('Registration error:', error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_COMPANY',
            message: 'Company with this email already exists',
          },
        });
      }

      // Handle validation errors
      if (error.message === 'Invalid email format') {
        return res.status(400).json({
          error: {
            code: 'INVALID_EMAIL',
            message: error.message,
          },
        });
      }

      if (error.message === 'User email is already taken') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_TAKEN',
            message: error.message,
          },
        });
      }

      if (error.message === 'Company email is already taken') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_TAKEN',
            message: error.message,
          },
        });
      }

      // Handle location creation errors
      if (error.message?.includes('Failed to create company locations')) {
        return res.status(400).json({
          error: {
            code: 'LOCATION_CREATION_FAILED',
            message: error.message,
          },
        });
      }

      // Handle company setup errors
      if (error.message?.includes('failed to set up defaults')) {
        return res.status(500).json({
          error: {
            code: 'SETUP_FAILED',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register company and manager',
        },
      });
    }
  }

  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { email, password, companyId } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email and password are required',
          },
        });
      }

      const result = await AuthService.login(email, password, companyId);

      // Record successful login attempt
      await recordLoginAttempt(email, req.ip, true);

      // Set refresh token as httpOnly cookie with proper configuration
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        // Cross-site requests from frontend (Vercel) to backend (Render) require SameSite=None
        sameSite: config.cookie.sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Get full company data for Redux
      const company = await Company.findById(result.user.companyId);

      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        tokenExpiry: result.tokenExpiry,
        company, // Send full company object
      });
    } catch (error) {
      logger.error('Login error:', error);

      if (error.message === 'Invalid credentials') {
        // Record failed login attempt
        await recordLoginAttempt(req.body.email, req.ip, false);

        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
      }
      if (error.message === 'MULTIPLE_COMPANIES') {
        return res.status(409).json({
          error: {
            code: 'MULTIPLE_COMPANIES',
            message: 'Multiple companies found for this email. Please specify company.',
            companies: error.companies || [],
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed',
        },
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req, res) {
    try {
      const bodyToken = req.body?.refreshToken;
      const cookieToken = req.cookies?.refreshToken;
      const refreshToken = bodyToken || cookieToken;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Refresh token is required',
          },
        });
      }

      const result = await AuthService.refreshToken(refreshToken);

      // TOKEN ROTATION: Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Get full user and company data for session restoration
      const company = await Company.findById(result.user.companyId);

      res.json({
        message: 'Token refreshed successfully',
        accessToken: result.accessToken,
        tokenExpiry: result.tokenExpiry,
        user: result.user,
        company,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      if (error.message === 'Invalid refresh token') {
        return res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh token',
        },
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      // Get refresh token from cookie (primary) or body (fallback)
      const cookieToken = req.cookies?.refreshToken;
      const bodyToken = req.body?.refreshToken;
      const refreshToken = cookieToken || bodyToken;

      if (refreshToken) {
        try {
          await AuthService.logout(refreshToken);
          logger.info('User logged out successfully');
        } catch (logoutError) {
          logger.warn('Error during logout service call:', logoutError);
          // Continue with logout even if service call fails
        }
      }

      // Always clear refresh token cookie with same configuration as set
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: '/',
      });

      res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);

      // Even if there's an error, try to clear the cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: '/',
      });

      res.status(500).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
        },
      });
    }
  }
}
