import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import RefreshToken from '../models/RefreshToken.js';
import { CompanySetupService } from './companySetupService.js';
import { checkEmailAvailability, isValidEmailFormat } from '../utils/emailValidation.js';
import logger from '../utils/logger.js';
import { Company, Location, User } from '@petbuddy/shared';

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, config.bcrypt.saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} duration - Duration string like "15m", "7d", "1h", "30s"
   * @returns {number} - Milliseconds
   */
  static parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      logger.warn(`Invalid duration format: ${duration}, returning 0`);
      return 0;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
  }

  /**
   * Generate JWT tokens
   */
  static generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessTokenTtl,
    });

    const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenTtl,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Register first manager for a company
   */
  static async registerManager(companyData, userData) {
    const session = await User.startSession();

    try {
      // Validate email format
      if (!isValidEmailFormat(userData.email)) {
        throw new Error('Invalid email format');
      }

      // Check email availability for both user and company
      const emailAvailability = await checkEmailAvailability(userData.email);

      if (!emailAvailability.userAvailable) {
        throw new Error('User email is already taken');
      }

      if (!emailAvailability.companyAvailable) {
        throw new Error('Company email is already taken');
      }

      await session.withTransaction(async () => {
        // Merge company data with defaults
        const companyWithDefaults = CompanySetupService.mergeWithDefaults(companyData);

        // Set default logo if none provided
        if (!companyWithDefaults.logo) {
          companyWithDefaults.logo = CompanySetupService.getDefaultCompanyLogo();
        }
        if (!companyWithDefaults.ringLogo) {
          companyWithDefaults.ringLogo = CompanySetupService.getDefaultCompanyLogo();
        }

        // Create company
        const company = new Company(companyWithDefaults);
        await company.save({ session });

        // Hash password
        const passwordHash = await this.hashPassword(userData.password);

        // Set default user picture if none provided
        const userPicture = userData.picture || CompanySetupService.getDefaultUserPicture();

        // Compose fullName from first/last if not provided
        const composedFullName = (
          userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`
        ).trim();

        // Create manager user
        // Managers by default can manage all services, so no serviceCategoryIds restriction
        const user = new User({
          ...userData,
          fullName: composedFullName,
          companyId: company._id,
          passwordHash,
          role: 'manager',
          picture: userPicture,
          serviceCategoryIds: [], // Empty = can handle all services
        });
        await user.save({ session });

        // Create initial locations if provided in registration
        const inputLocations = Array.isArray(companyData?.locations) ? companyData.locations : [];
        if (inputLocations.length > 0) {
          // Ensure one main location
          const hasMain = inputLocations.some(l => l?.isMain === true);
          const normalized = inputLocations.map((l, idx) => ({
            companyId: company._id,
            label: String(l.label || `Location ${idx + 1}`).trim(),
            address: String(l.address || '').trim(),
            googleLocationUrl: l.googleLocationUrl ? String(l.googleLocationUrl).trim() : '',
            phone: l.phone ? String(l.phone).trim() : '',
            timezone: l.timezone
              ? String(l.timezone).trim()
              : companyWithDefaults.timezone || 'UTC',
            isMain: hasMain ? Boolean(l.isMain) : idx === 0,
          }));

          try {
            await Location.insertMany(normalized, { session });
            logger.info(`Created ${normalized.length} initial location(s) for company: ${company.name}`);
          } catch (locErr) {
            logger.error('Failed to create initial locations during registration:', locErr);
            throw new Error(`Failed to create company locations: ${locErr.message}`);
          }
        }

        // Set up default configurations for the new company (inside transaction)
        try {
          await CompanySetupService.setupDefaults(company._id, session);
          logger.info(`Default configurations set up successfully for company: ${company.name}`);
        } catch (setupError) {
          logger.error(`Failed to set up defaults for company ${company.name}:`, setupError);
          throw new Error(`Company created but failed to set up defaults: ${setupError.message}`);
        }

        logger.info(`Company and manager created: ${company.name}`);

        // Generate tokens for auto-login
        const { accessToken, refreshToken } = this.generateTokens(user._id);

        // Save refresh token to database
        await RefreshToken.create(
          [
            {
              userId: user._id,
              token: refreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          ],
          { session }
        );

        // Convert TTL string (e.g., "15m") to milliseconds
        const ttlMs = this.parseDuration(config.jwt.accessTokenTtl);

        // Store for return (outside transaction)
        session.registrationResult = {
          company,
          user: {
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            companyId: company._id,
            picture: user.picture,
            color: user.color,
          },
          accessToken,
          refreshToken,
          tokenExpiry: Date.now() + ttlMs,
        };
      });

      return session.registrationResult;
    } catch (error) {
      logger.error('Error registering manager:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Login user
   */
  static async login(email, password, companyId) {
    try {
      let user = null;
      if (companyId) {
        user = await User.findOne({ email, companyId }).populate('companyId');
      } else {
        // Find all users with this email
        const users = await User.find({ email }).populate('companyId');
        if (users.length === 0) {
          throw new Error('Invalid credentials');
        }
        if (users.length > 1) {
          const err = new Error('MULTIPLE_COMPANIES');
          err.companies = users.map(u => ({
            companyId: u.companyId?._id || u.companyId,
            companyName: u.companyId?.name || 'Unknown Company',
          }));
          throw err;
        }
        user = users[0];
      }
      if (!user || !user.isActive) {
        throw new Error('Invalid credentials');
      }

      // Ensure user has a valid companyId
      if (!user.companyId) {
        throw new Error('User account is not properly configured. Please contact support.');
      }

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id);

      // Save refresh token
      await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + this.parseDuration(config.jwt.refreshTokenTtl)),
        userAgent: 'web', // TODO: Extract from request
        ip: '127.0.0.1', // TODO: Extract from request
      });

      return {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          color: user.color,
          role: user.role,
          companyId: user.companyId?._id || user.companyId || null,
          companyName: user.companyId?.name || 'Unknown Company',
        },
        accessToken,
        refreshToken,
        tokenExpiry: new Date(
          Date.now() + this.parseDuration(config.jwt.accessTokenTtl)
        ).toISOString(),
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(token) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(token, config.jwt.refreshSecret);

      // Check if token exists and is not revoked
      const refreshTokenDoc = await RefreshToken.findOne({
        token,
        userId: decoded.userId,
        revokedAt: null,
      });

      if (!refreshTokenDoc) {
        throw new Error('Invalid refresh token');
      }

      // Fetch user data for session restoration
      const user = await User.findById(decoded.userId)
        .select('-passwordHash')
        .lean();

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // TOKEN ROTATION: Generate new refresh token and revoke old one
      const { refreshToken: newRefreshToken } = this.generateTokens(decoded.userId);

      // Revoke old refresh token
      await RefreshToken.updateOne(
        { _id: refreshTokenDoc._id },
        { $set: { revokedAt: new Date() } }
      );

      // Store new refresh token
      const refreshTokenExpiry = new Date(Date.now() + this.parseDuration(config.jwt.refreshTokenTtl));
      await RefreshToken.create({
        userId: decoded.userId,
        token: newRefreshToken,
        expiresAt: refreshTokenExpiry,
      });

      // Generate new access token
      const accessToken = jwt.sign({ userId: decoded.userId }, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessTokenTtl,
      });

      // Calculate token expiry
      const tokenExpiry = new Date(
        Date.now() + this.parseDuration(config.jwt.accessTokenTtl)
      ).toISOString();

      return {
        accessToken,
        tokenExpiry,
        refreshToken: newRefreshToken, // Return new refresh token for cookie update
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          companyId: user.companyId,
          color: user.color,
          phone: user.phone,
          picture: user.picture,
        },
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  static async logout(token) {
    try {
      await RefreshToken.findOneAndUpdate({ token }, { revokedAt: new Date() });

      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
}
