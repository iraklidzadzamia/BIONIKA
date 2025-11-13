import CompanyIntegration from '../models/CompanyIntegration.js';
import logger from './logger.js';
import { exchangeForLongLivedToken, getPageTokenFromUser, debugAccessToken } from './meta.js';

/**
 * Refresh Facebook page access tokens that are expiring soon
 * Should be run daily via cron job
 */
export async function refreshExpiringFacebookTokens() {
  try {
    logger.info('Starting Facebook token refresh job...');

    // Find all integrations with tokens expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const integrations = await CompanyIntegration.find({
      facebookAccessToken: { $exists: true, $ne: '' },
      facebookTokenSource: 'user_long_lived',
      facebookTokenExpiresAt: { $lt: sevenDaysFromNow },
    });

    logger.info(`Found ${integrations.length} tokens expiring within 7 days`);

    let refreshed = 0;
    let failed = 0;

    for (const integration of integrations) {
      try {
        const pageId = integration.facebookChatId;
        const currentToken = integration.facebookAccessToken;

        if (!pageId || !currentToken) {
          logger.warn(`Skipping integration ${integration._id}: missing pageId or token`);
          continue;
        }

        // Exchange current token for a new long-lived token
        const newLongLivedToken = await exchangeForLongLivedToken(currentToken);

        // Get fresh page token from the new long-lived token
        const newPageToken = await getPageTokenFromUser(pageId, newLongLivedToken);

        // Debug the new token to get expiry
        let newExpiresAt = null;
        let newScopes = [];
        try {
          const debugInfo = await debugAccessToken(newPageToken);
          if (debugInfo?.expires_at) {
            newExpiresAt = new Date(debugInfo.expires_at * 1000);
          }
          if (Array.isArray(debugInfo?.scopes)) {
            newScopes = debugInfo.scopes;
          }
        } catch (e) {
          logger.warn(`Debug token failed for company ${integration.companyId}:`, e?.message);
        }

        // Update the integration with new token
        await CompanyIntegration.findByIdAndUpdate(integration._id, {
          $set: {
            facebookAccessToken: newPageToken,
            facebookTokenExpiresAt: newExpiresAt,
            facebookTokenScopes: newScopes,
          },
        });

        refreshed++;
        logger.info(
          `Refreshed token for company ${integration.companyId}, new expiry: ${newExpiresAt}`
        );
      } catch (error) {
        failed++;
        logger.error(
          `Failed to refresh token for company ${integration.companyId}:`,
          error?.message || error
        );
      }
    }

    logger.info(
      `Token refresh job completed. Refreshed: ${refreshed}, Failed: ${failed}, Total: ${integrations.length}`
    );

    return { refreshed, failed, total: integrations.length };
  } catch (error) {
    logger.error('Token refresh job error:', error);
    throw error;
  }
}

/**
 * Check if a company's Facebook token is expired or expiring soon
 */
export async function checkTokenHealth(companyId) {
  try {
    const integration = await CompanyIntegration.findOne({ companyId });

    if (!integration?.facebookAccessToken) {
      return { status: 'not_connected' };
    }

    if (!integration.facebookTokenExpiresAt) {
      return { status: 'unknown_expiry', hasToken: true };
    }

    const now = new Date();
    const expiresAt = new Date(integration.facebookTokenExpiresAt);
    const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', expiresAt, daysUntilExpiry };
    }

    if (daysUntilExpiry < 7) {
      return { status: 'expiring_soon', expiresAt, daysUntilExpiry };
    }

    return { status: 'healthy', expiresAt, daysUntilExpiry };
  } catch (error) {
    logger.error('Token health check error:', error);
    return { status: 'error', error: error.message };
  }
}