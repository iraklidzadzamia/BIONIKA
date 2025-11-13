import logger from '../utils/logger.js';
import { config } from '../config/env.js';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  saveTokens,
  listCalendars,
  setSelectedCalendar,
  revokeCompanyTokens,
  getGoogleSettings,
  setGoogleAutoSync,
} from '../services/googleService.js';

export class GoogleController {
  static async getAuthUrl(req, res) {
    try {
      const { companyId } = req.user;
      const url = generateAuthUrl(companyId);
      res.json({ url });
    } catch (error) {
      logger.error('Google getAuthUrl error:', error);
      res
        .status(500)
        .json({ error: { code: 'AUTH_URL_FAILED', message: 'Failed to build auth URL' } });
    }
  }

  static async oauthCallback(req, res) {
    try {
      const { code, state } = req.query;
      if (!code)
        return res.status(400).json({ error: { code: 'MISSING_CODE', message: 'Missing code' } });

      // Validate and decode state parameter
      let { companyId } = req.user || {};
      if (!companyId && state) {
        try {
          const decoded = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
          if (!decoded.companyId) {
            throw new Error('Invalid state: missing companyId');
          }
          companyId = decoded.companyId;
        } catch (err) {
          logger.error('Failed to decode state parameter:', err);
          return res
            .status(400)
            .json({ error: { code: 'INVALID_STATE', message: 'Invalid or corrupted state parameter' } });
        }
      }
      if (!companyId)
        return res
          .status(400)
          .json({ error: { code: 'MISSING_COMPANY', message: 'Missing companyId' } });

      const tokens = await exchangeCodeForTokens(code);
      await saveTokens(companyId, tokens);

      // Redirect back to frontend settings page
      const redirectUrl = `${config.frontendUrl}/settings/company?google=connected`;
      res.redirect(302, redirectUrl);
    } catch (error) {
      logger.error('Google oauthCallback error:', error);
      const redirectUrl = `${config.frontendUrl}/settings/company?google=error`;
      res.redirect(302, redirectUrl);
    }
  }

  static async listCalendars(req, res) {
    try {
      const { companyId } = req.user;
      const calendars = await listCalendars(companyId);
      res.json({ calendars });
    } catch (error) {
      logger.error('Google listCalendars error:', error);
      const code = error.code === 'GOOGLE_NOT_CONNECTED' ? 400 : 500;
      res.status(code).json({
        error: {
          code: error.code || 'LIST_FAILED',
          message: error.message || 'Failed to list calendars',
        },
      });
    }
  }

  static async selectCalendar(req, res) {
    try {
      const { companyId } = req.user;
      const { calendarId } = req.body || {};
      if (!calendarId)
        return res
          .status(400)
          .json({ error: { code: 'MISSING_CALENDAR', message: 'calendarId is required' } });
      await setSelectedCalendar(companyId, calendarId);
      res.json({ success: true });
    } catch (error) {
      logger.error('Google selectCalendar error:', error);
      res
        .status(500)
        .json({ error: { code: 'SELECT_FAILED', message: 'Failed to select calendar' } });
    }
  }

  static async disconnect(req, res) {
    try {
      const { companyId } = req.user;
      await revokeCompanyTokens(companyId);
      res.json({ success: true });
    } catch (error) {
      logger.error('Google disconnect error:', error);
      res
        .status(500)
        .json({ error: { code: 'DISCONNECT_FAILED', message: 'Failed to disconnect Google' } });
    }
  }

  static async getSettings(req, res) {
    try {
      const { companyId } = req.user;
      const settings = await getGoogleSettings(companyId);
      res.json({ settings });
    } catch (error) {
      logger.error('Google getSettings error:', error);
      res
        .status(500)
        .json({ error: { code: 'GET_SETTINGS_FAILED', message: 'Failed to get settings' } });
    }
  }

  static async updateAutoSync(req, res) {
    try {
      const { companyId } = req.user;
      const { autoSync } = req.body || {};
      await setGoogleAutoSync(companyId, !!autoSync);
      res.json({ success: true });
    } catch (error) {
      logger.error('Google updateAutoSync error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_SETTINGS_FAILED', message: 'Failed to update auto sync' } });
    }
  }
}
