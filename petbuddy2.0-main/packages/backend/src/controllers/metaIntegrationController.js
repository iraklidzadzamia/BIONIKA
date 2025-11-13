/**
 * Meta Integration Controller
 * Clean, focused controller for Facebook and Instagram integration
 */
import { MetaIntegrationService } from '../services/metaIntegrationService.js';
import logger from '../utils/logger.js';

export class MetaIntegrationController {
  /**
   * GET /api/v1/settings/meta
   * Get Meta integration status
   */
  static async getStatus(req, res) {
    try {
      const { companyId } = req.user;

      const status = await MetaIntegrationService.getIntegrationStatus(companyId);

      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Get Meta status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch Meta integration status',
        },
      });
    }
  }

  /**
   * POST /api/v1/settings/meta/facebook/connect
   * Connect Facebook page
   */
  static async connectFacebook(req, res) {
    try {
      const { companyId } = req.user;
      const { pageId, pageName, pageCategory, userAccessToken, instagramChatId } = req.body;

      // Validate required fields
      if (!pageId || !userAccessToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'pageId and userAccessToken are required',
          },
        });
      }

      // Connect Facebook page
      const result = await MetaIntegrationService.connectFacebookPage({
        companyId,
        pageId,
        pageName,
        userAccessToken,
      });

      // If Instagram account is provided, connect it too
      if (instagramChatId) {
        await MetaIntegrationService.connectInstagram({
          companyId,
          instagramAccountId: instagramChatId,
        });
      }

      res.json({
        success: true,
        message: 'Facebook page connected successfully',
        data: {
          pageId: result.pageId,
          pageName: result.pageName,
          instagramConnected: !!instagramChatId,
        },
      });
    } catch (error) {
      logger.error('Connect Facebook error:', error);

      const statusCode = error.message?.includes('token') ? 401 : 500;
      const errorMessage = error.message || 'Failed to connect Facebook page';

      res.status(statusCode).json({
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Failed to connect Facebook page',
          details: errorMessage,
        },
      });
    }
  }

  /**
   * POST /api/v1/settings/meta/facebook/disconnect
   * Disconnect Facebook integration
   */
  static async disconnectFacebook(req, res) {
    try {
      const { companyId } = req.user;

      await MetaIntegrationService.disconnectFacebook(companyId);

      res.json({
        success: true,
        message: 'Facebook disconnected successfully',
      });
    } catch (error) {
      logger.error('Disconnect Facebook error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DISCONNECT_FAILED',
          message: 'Failed to disconnect Facebook',
        },
      });
    }
  }

  /**
   * POST /api/v1/settings/meta/instagram/disconnect
   * Disconnect Instagram integration
   */
  static async disconnectInstagram(req, res) {
    try {
      const { companyId } = req.user;

      await MetaIntegrationService.disconnectInstagram(companyId);

      res.json({
        success: true,
        message: 'Instagram disconnected successfully',
      });
    } catch (error) {
      logger.error('Disconnect Instagram error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DISCONNECT_FAILED',
          message: 'Failed to disconnect Instagram',
        },
      });
    }
  }
}
