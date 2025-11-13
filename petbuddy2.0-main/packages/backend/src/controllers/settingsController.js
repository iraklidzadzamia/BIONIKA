;
import CompanyIntegration from '../models/CompanyIntegration.js';
import AIPrompt from '../models/AIPrompt.js';
import logger from '../utils/logger.js';
import {
  subscribeAppToPage,
  getAppAccessToken,
  debugAccessToken,
  getPageTokenFromSystemUser,
  getPageTokenFromUser,
  exchangeForLongLivedToken,
} from '../utils/meta.js';
import { checkTokenHealth } from '../utils/tokenRefresh.js';
import { Company } from '@petbuddy/shared';

export class SettingsController {
  static async getIntegrations(req, res) {
    try {
      const { companyId } = req.user;
      logger.info(`Get integrations for company ${companyId}`);

      const doc = await CompanyIntegration.findOne({ companyId }).lean();
      logger.info(`Found integration document:`, doc ? 'yes' : 'no');

      // Mask secrets
      const mask = v =>
        typeof v === 'string' && v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : v || '';
      const safe = doc
        ? {
            ...doc,
            facebookAccessToken: mask(doc.facebookAccessToken),
            facebookAppAccessToken: mask(doc.facebookAppAccessToken),
            openaiApiKey: mask(doc.openaiApiKey),
            googleAccessToken: mask(doc.googleAccessToken),
            googleRefreshToken: mask(doc.googleRefreshToken),
          }
        : null;

      logger.info(`Returning safe integration data for company ${companyId}`);
      res.json({ integration: safe });
    } catch (error) {
      logger.error('Get integrations error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch integrations' } });
    }
  }

  static async upsertIntegrations(req, res) {
    try {
      const { companyId } = req.user;
      logger.info(`Upsert integrations for company ${companyId}:`, req.body);

      // Check if this is a disconnection request
      const isDisconnection = Object.values(req.body).every(
        val => typeof val === 'string' && val.trim() === ''
      );
      logger.info(`Is disconnection request: ${isDisconnection}`);

      let updateOperation;

      if (isDisconnection) {
        // For disconnection, use $unset to remove the fields
        updateOperation = {
          $unset: {
            facebookChatId: '',
            instagramChatId: '',
            facebookAccessToken: '',
            openaiApiKey: '',
          },
        };
        logger.info(`Using $unset operation for disconnection:`, updateOperation);
      } else {
        // For regular updates, use $set with the provided values
        const update = {};
        const keys = [
          'facebookChatId',
          'instagramChatId',
          'facebookAccessToken',
          'openaiApiKey',
          'googleAccessToken',
          'googleRefreshToken',
        ];

        // Helper function to pick values if present
        const pickIfPresent = key => {
          if (Object.prototype.hasOwnProperty.call(req.body, key)) {
            const v = req.body[key];
            logger.info(`Processing field ${key}:`, {
              value: v,
              type: typeof v,
              isString: typeof v === 'string',
              isEmpty: typeof v === 'string' && v.trim() === '',
            });
            // Allow empty strings to clear fields (for disconnection)
            // Allow non-empty strings and other values
            return v;
          }
          return undefined;
        };

        for (const k of keys) {
          const val = pickIfPresent(k);
          if (val !== undefined) update[k] = val;
        }
        updateOperation = { $set: update };
        logger.info(`Using $set operation for update:`, updateOperation);
      }

      const doc = await CompanyIntegration.findOneAndUpdate({ companyId }, updateOperation, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }).lean();

      logger.info(`Integration updated successfully for company ${companyId}`);
      logger.info(`Updated document:`, doc);

      res.json({
        integration: {
          ...doc,
          facebookAccessToken: !!doc.facebookAccessToken,
          openaiApiKey: !!doc.openaiApiKey,
          googleAccessToken: !!doc.googleAccessToken,
          googleRefreshToken: !!doc.googleRefreshToken,
        },
      });
    } catch (error) {
      logger.error('Upsert integrations error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPSERT_FAILED', message: 'Failed to save integrations' } });
    }
  }

  static async getBot(req, res) {
    try {
      const { companyId } = req.user;
      const company = await Company.findById(companyId, 'bot').lean();
      res.json({ bot: company?.bot || null });
    } catch (error) {
      logger.error('Get bot settings error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch bot settings' } });
    }
  }

  static async updateBot(req, res) {
    try {
      const { companyId } = req.user;
      const update = {};

      if (req.body.systemInstruction !== undefined)
        update['bot.systemInstruction'] = req.body.systemInstruction;
      if (req.body.active !== undefined) update['bot.active'] = Boolean(req.body.active);
      if (req.body.activeHours?.intervalActive !== undefined)
        update['bot.activeHours.intervalActive'] = Boolean(req.body.activeHours.intervalActive);
      if (req.body.activeHours?.startTime !== undefined)
        update['bot.activeHours.startTime'] = req.body.activeHours.startTime;
      if (req.body.activeHours?.endTime !== undefined)
        update['bot.activeHours.endTime'] = req.body.activeHours.endTime;

      // Handle AI prompt selection
      if (req.body.selectedPromptId !== undefined) {
        if (req.body.selectedPromptId) {
          // Get the selected prompt and use its system instruction
          const prompt = await AIPrompt.findById(req.body.selectedPromptId).lean();
          if (prompt) {
            update['bot.systemInstruction'] = prompt.systemInstruction;
            update['bot.selectedPromptId'] = req.body.selectedPromptId;
            update['bot.selectedPromptName'] = prompt.name;
            update['bot.selectedPromptCategory'] = prompt.category;

            // Increment usage count
            await AIPrompt.findByIdAndUpdate(req.body.selectedPromptId, {
              $inc: { usageCount: 1 },
            });
          }
        } else {
          // Clear selected prompt
          update['bot.selectedPromptId'] = null;
          update['bot.selectedPromptName'] = null;
          update['bot.selectedPromptCategory'] = null;
        }
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        { $set: update },
        { new: true, runValidators: true, projection: { bot: 1 } }
      ).lean();

      res.json({ bot: company?.bot || null });
    } catch (error) {
      logger.error('Update bot settings error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update bot settings' } });
    }
  }

  static async getCompany(req, res) {
    try {
      const { companyId } = req.user;
      const company = await Company.findById(companyId)
        .select(
          'name email phone address timezone businessTypes logo ringLogo registrationId registrationName paymentMethods status settings.workHours settings.holidays'
        )
        .lean();
      res.json({ company });
    } catch (error) {
      logger.error('Get company profile error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch company profile' } });
    }
  }

  static async updateCompany(req, res) {
    try {
      const { companyId } = req.user;
      const up = {};
      const directKeys = [
        'name',
        'email',
        'phone',
        'address',
        'timezone',
        'businessTypes',
        'logo',
        'ringLogo',
        'registrationId',
        'registrationName',
        'status',
      ];
      for (const k of directKeys) {
        if (Object.prototype.hasOwnProperty.call(req.body, k)) up[k] = req.body[k];
      }
      if (Array.isArray(req.body.paymentMethods)) {
        up.paymentMethods = req.body.paymentMethods.map(s => String(s));
      }
      if (Array.isArray(req.body.workHours)) {
        up['settings.workHours'] = req.body.workHours;
      }
      const company = await Company.findByIdAndUpdate(
        companyId,
        { $set: up },
        { new: true, runValidators: true }
      )
        .select(
          'name email phone address timezone businessTypes logo ringLogo registrationId registrationName paymentMethods status settings.workHours settings.holidays'
        )
        .lean();
      res.json({ company });
    } catch (error) {
      logger.error('Update company profile error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update company profile' } });
    }
  }

  static async getMetaIntegration(req, res) {
    try {
      const { companyId } = req.user;
      const integrationDoc = await CompanyIntegration.findOne({ companyId }).lean();

      // Compose meta purely from CompanyIntegration
      const fbPageId = integrationDoc?.facebookChatId || '';
      const igPageId = integrationDoc?.instagramChatId || '';
      const fbAccessToken = integrationDoc?.facebookAccessToken || '';
      const fbAppAccessToken = integrationDoc?.facebookAppAccessToken || '';
      const igAccessToken = integrationDoc?.facebookAccessToken || '';

      // Check token health
      const tokenHealth = await checkTokenHealth(companyId);

      const meta = {
        facebook: {
          connected: !!(fbPageId && fbAccessToken),
          pageId: fbPageId,
          accessToken: fbAccessToken ? `***${fbAccessToken.slice(-4)}` : '',
          appAccessToken: fbAppAccessToken ? `***${fbAppAccessToken.slice(-4)}` : '',
          tokenSource: integrationDoc?.facebookTokenSource,
          tokenExpiresAt: integrationDoc?.facebookTokenExpiresAt,
          tokenHealth,
        },
        instagram: {
          connected: !!(igPageId && igAccessToken),
          pageId: igPageId,
          accessToken: igAccessToken ? `***${igAccessToken.slice(-4)}` : '',
        },
      };

      res.json({ meta });
    } catch (error) {
      logger.error('Get Meta integration error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch Meta integration' } });
    }
  }

  // DEPRECATED: Use connectMetaPage instead
  static async updateMetaIntegration(req, res) {
    try {
      const { companyId } = req.user;
      const { platform, pageId } = req.body;
      const userAccessToken =
        req.body.accessToken ||
        req.body.userAccessToken ||
        req.body.pageAccessToken;

      if (!platform || !['facebook', 'instagram'].includes(platform)) {
        return res.status(400).json({
          error: { code: 'INVALID_PLATFORM', message: 'Platform must be facebook or instagram' },
        });
      }

      if (!pageId || !userAccessToken) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELDS', message: 'Page ID and User Access Token are required' },
        });
      }

      // Redirect to the new connectMetaPage logic
      if (platform === 'facebook') {
        req.body.userAccessToken = userAccessToken;
        req.body.pageId = pageId;
        return SettingsController.connectMetaPage(req, res);
      }

      // Instagram: just store the page ID (token managed by Facebook page connection)
      await CompanyIntegration.findOneAndUpdate(
        { companyId },
        { $set: { instagramChatId: pageId } },
        { upsert: true }
      );

      const integrationDoc = await CompanyIntegration.findOne({ companyId }).lean();
      res.json({
        meta: {
          facebook: {
            connected: !!(integrationDoc?.facebookChatId && integrationDoc?.facebookAccessToken),
            pageId: integrationDoc?.facebookChatId || '',
          },
          instagram: {
            connected: !!(integrationDoc?.instagramChatId),
            pageId: integrationDoc?.instagramChatId || '',
          },
        },
        message: 'Instagram integration updated successfully',
      });
    } catch (error) {
      logger.error('Update Meta integration error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update Meta integration' } });
    }
  }

  static async disconnectMetaIntegration(req, res) {
    try {
      const { companyId } = req.user;
      const { platform } = req.body;

      if (!platform || !['facebook', 'instagram'].includes(platform)) {
        return res.status(400).json({
          error: { code: 'INVALID_PLATFORM', message: 'Platform must be facebook or instagram' },
        });
      }

      const unsetFields = {};
      if (platform === 'facebook') {
        unsetFields.facebookChatId = '';
        unsetFields.facebookAccessToken = '';
        unsetFields.facebookAppAccessToken = '';
        unsetFields.facebookTokenSource = '';
        unsetFields.facebookTokenExpiresAt = '';
        unsetFields.facebookTokenScopes = '';
      } else if (platform === 'instagram') {
        unsetFields.instagramChatId = '';
      }

      await CompanyIntegration.findOneAndUpdate(
        { companyId },
        { $unset: unsetFields },
        { upsert: true }
      );

      logger.info(`Meta ${platform} integration disconnected for company: ${companyId}`);
      res.json({
        success: true,
        message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected successfully`,
      });
    } catch (error) {
      logger.error('Disconnect Meta integration error:', error);
      res.status(500).json({
        error: { code: 'DISCONNECT_FAILED', message: 'Failed to disconnect Meta integration' },
      });
    }
  }

  static async connectMetaPage(req, res) {
    try {
      const { companyId } = req.user;
      const { pageId, pageName, pageCategory, userAccessToken, systemUserAccessToken, pageAccessToken } = req.body;

      if (!pageId || (!userAccessToken && !systemUserAccessToken && !pageAccessToken)) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'pageId and either userAccessToken, systemUserAccessToken, or pageAccessToken are required',
          },
        });
      }

      let effectivePageAccessToken;
      let tokenSource;

      if (systemUserAccessToken) {
        // Permanent via System User (preferred for production)
        effectivePageAccessToken = await getPageTokenFromSystemUser(pageId, systemUserAccessToken);
        tokenSource = 'system_user';
        logger.info(`Using system user token for company ${companyId}`);
      } else if (userAccessToken) {
        // CRITICAL: Always exchange user token for long-lived token, then get page token
        // Page tokens from /me/accounts inherit the user token's short expiry (2 hours)
        // We MUST exchange for long-lived user token (60 days), then fetch page token
        // This gives us a 60-DAY page token (as of Facebook policy 2024+)
        // Note: Facebook no longer provides permanent (never-expiring) tokens via user flow
        logger.info(`Exchanging user token for long-lived token for company ${companyId}`);
        const longLivedUserToken = await exchangeForLongLivedToken(userAccessToken);
        logger.info(`Getting page token from long-lived user token for company ${companyId}`);
        effectivePageAccessToken = await getPageTokenFromUser(pageId, longLivedUserToken);
        tokenSource = 'user_long_lived';
      } else if (pageAccessToken) {
        // Fallback: Use page token directly (but this may be short-lived if from /me/accounts)
        // WARN: This token may expire in 1-2 hours if it came from a short-lived user token
        logger.warn(`Using page access token directly for company ${companyId} - may be short-lived!`);
        effectivePageAccessToken = pageAccessToken;
        tokenSource = 'page_direct';
      } else {
        throw new Error('No valid token provided');
      }

      // Subscribe app to page webhooks
      await subscribeAppToPage(pageId, effectivePageAccessToken);

      // Get app access token
      const appAccessToken = await getAppAccessToken();

      // Debug token for metadata (optional)
      let facebookTokenExpiresAt = null;
      let facebookTokenScopes = [];
      try {
        const debugInfo = await debugAccessToken(effectivePageAccessToken);

        // Log token type for debugging
        logger.info(`Token debug info for company ${companyId}:`, {
          type: debugInfo?.type,
          expires_at: debugInfo?.expires_at,
          data_access_expires_at: debugInfo?.data_access_expires_at,
          is_valid: debugInfo?.is_valid,
        });

        // Page tokens from long-lived user tokens typically expire in 60 days (Facebook policy 2024+)
        // In rare cases, expires_at = 0 means never expires (legacy/system user tokens)
        if (debugInfo?.expires_at && debugInfo.expires_at > 0) {
          facebookTokenExpiresAt = new Date(debugInfo.expires_at * 1000);
          const daysUntilExpiry = Math.floor((facebookTokenExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
          logger.info(`Page token for company ${companyId} expires in ${daysUntilExpiry} days at ${facebookTokenExpiresAt.toISOString()}`);
        } else {
          // Token doesn't expire (permanent - rare with user tokens, typical with system user)
          logger.info(`Page token for company ${companyId} does not expire (permanent)`);
        }

        if (Array.isArray(debugInfo?.scopes)) {
          facebookTokenScopes = debugInfo.scopes;
        }
      } catch (e) {
        logger.warn('Debug token failed (non-fatal):', e?.message);
      }

      // Save to database
      await CompanyIntegration.findOneAndUpdate(
        { companyId },
        {
          $set: {
            facebookChatId: pageId,
            facebookAccessToken: effectivePageAccessToken,
            facebookAppAccessToken: appAccessToken,
            facebookTokenSource: tokenSource,
            facebookTokenExpiresAt,
            facebookTokenScopes,
          },
        },
        { upsert: true, new: true }
      );

      logger.info(`Facebook page connected for company ${companyId}: ${pageId}`);
      res.json({
        success: true,
        message: 'Facebook page connected successfully',
        data: { pageId, pageName, pageCategory },
      });
    } catch (error) {
      logger.error('connectMetaPage error:', error);
      const safeMessage = typeof error?.message === 'string' ? error.message : String(error);
      res.status(500).json({
        error: {
          code: 'CONNECT_FAILED',
          message: 'Failed to connect Facebook page',
          details: safeMessage,
        },
      });
    }
  }
}
