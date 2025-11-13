/**
 * Meta Integration Service
 * Handles Facebook and Instagram integration logic
 */
import CompanyIntegration from '../models/CompanyIntegration.js';
import logger from '../utils/logger.js';
import {
  subscribeAppToPage,
  getAppAccessToken,
  debugAccessToken,
  getPageTokenFromUser,
  exchangeForLongLivedToken,
} from '../utils/meta.js';

export class MetaIntegrationService {
  /**
   * Get integration status for a company
   */
  static async getIntegrationStatus(companyId) {
    const integration = await CompanyIntegration.findOne({ companyId }).lean();

    if (!integration) {
      return {
        facebook: { connected: false },
        instagram: { connected: false },
      };
    }

    return {
      facebook: {
        connected: !!(integration.facebookChatId && integration.facebookAccessToken),
        pageId: integration.facebookChatId || null,
        tokenSource: integration.facebookTokenSource,
        tokenExpiresAt: integration.facebookTokenExpiresAt,
      },
      instagram: {
        connected: !!integration.instagramChatId,
        accountId: integration.instagramChatId || null,
      },
    };
  }

  /**
   * Connect a Facebook page
   * This performs the complete flow: token exchange, webhook subscription, and storage
   */
  static async connectFacebookPage({ companyId, pageId, pageName, userAccessToken }) {
    try {
      logger.info(`Connecting Facebook page ${pageId} for company ${companyId}`);

      // Step 1: Exchange short-lived token for long-lived token (60 days)
      logger.info('Exchanging for long-lived user token...');
      const longLivedUserToken = await exchangeForLongLivedToken(userAccessToken);

      // Step 2: Get page access token using long-lived user token
      logger.info('Getting page access token...');
      const pageAccessToken = await getPageTokenFromUser(pageId, longLivedUserToken);

      // Step 3: Subscribe app to page webhooks
      logger.info('Subscribing to page webhooks...');
      await subscribeAppToPage(pageId, pageAccessToken);

      // Step 4: Get app access token
      logger.info('Getting app access token...');
      const appAccessToken = await getAppAccessToken();

      // Step 5: Debug token to get metadata
      const tokenMetadata = {
        expiresAt: null,
        scopes: [],
      };

      try {
        const debugInfo = await debugAccessToken(pageAccessToken);

        logger.info('Token debug info:', {
          type: debugInfo?.type,
          expires_at: debugInfo?.expires_at,
          is_valid: debugInfo?.is_valid,
        });

        // Page tokens from long-lived user tokens typically have expires_at = 0 (never expires)
        if (debugInfo?.expires_at && debugInfo.expires_at > 0) {
          tokenMetadata.expiresAt = new Date(debugInfo.expires_at * 1000);
        } else {
          logger.info('Page token does not expire (permanent)');
        }

        if (Array.isArray(debugInfo?.scopes)) {
          tokenMetadata.scopes = debugInfo.scopes;
        }
      } catch (debugError) {
        logger.warn('Failed to debug token (non-fatal):', debugError.message);
      }

      // Step 6: Save to database
      logger.info('Saving to database...');
      const integration = await CompanyIntegration.findOneAndUpdate(
        { companyId },
        {
          $set: {
            facebookChatId: pageId,
            facebookAccessToken: pageAccessToken,
            facebookAppAccessToken: appAccessToken,
            facebookTokenSource: 'user_long_lived',
            facebookTokenExpiresAt: tokenMetadata.expiresAt,
            facebookTokenScopes: tokenMetadata.scopes,
          },
        },
        { upsert: true, new: true }
      );

      logger.info(`Facebook page ${pageId} connected successfully for company ${companyId}`);

      return {
        success: true,
        pageId,
        pageName,
        integration,
      };
    } catch (error) {
      logger.error('Failed to connect Facebook page:', error);
      throw error;
    }
  }

  /**
   * Connect Instagram account
   * Note: Instagram uses the same token as Facebook page
   */
  static async connectInstagram({ companyId, instagramAccountId }) {
    try {
      logger.info(`Connecting Instagram account ${instagramAccountId} for company ${companyId}`);

      const integration = await CompanyIntegration.findOneAndUpdate(
        { companyId },
        { $set: { instagramChatId: instagramAccountId } },
        { upsert: true, new: true }
      );

      logger.info(`Instagram account ${instagramAccountId} connected for company ${companyId}`);

      return {
        success: true,
        accountId: instagramAccountId,
        integration,
      };
    } catch (error) {
      logger.error('Failed to connect Instagram:', error);
      throw error;
    }
  }

  /**
   * Disconnect Facebook integration
   */
  static async disconnectFacebook(companyId) {
    try {
      logger.info(`Disconnecting Facebook for company ${companyId}`);

      await CompanyIntegration.findOneAndUpdate(
        { companyId },
        {
          $unset: {
            facebookChatId: '',
            facebookAccessToken: '',
            facebookAppAccessToken: '',
            facebookTokenSource: '',
            facebookTokenExpiresAt: '',
            facebookTokenScopes: '',
          },
        }
      );

      logger.info(`Facebook disconnected for company ${companyId}`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to disconnect Facebook:', error);
      throw error;
    }
  }

  /**
   * Disconnect Instagram integration
   */
  static async disconnectInstagram(companyId) {
    try {
      logger.info(`Disconnecting Instagram for company ${companyId}`);

      await CompanyIntegration.findOneAndUpdate(
        { companyId },
        { $unset: { instagramChatId: '' } }
      );

      logger.info(`Instagram disconnected for company ${companyId}`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to disconnect Instagram:', error);
      throw error;
    }
  }
}
