import { refreshExpiringFacebookTokens } from '../utils/tokenRefresh.js';
import logger from '../utils/logger.js';

/**
 * Start interval-based token refresh job
 * Runs every 24 hours
 */
export function startTokenRefreshJob() {
  // Run immediately on startup (after 10 seconds)
  setTimeout(async () => {
    logger.info('Initial token refresh check...');
    try {
      await refreshExpiringFacebookTokens();
    } catch (error) {
      logger.error('Initial token refresh failed:', error);
    }
  }, 10000);

  // Then run every 24 hours
  setInterval(
    async () => {
      logger.info('Scheduled token refresh triggered');
      try {
        await refreshExpiringFacebookTokens();
      } catch (error) {
        logger.error('Scheduled token refresh failed:', error);
      }
    },
    24 * 60 * 60 * 1000
  ); // 24 hours

  logger.info('Token refresh job scheduled (every 24 hours)');
}