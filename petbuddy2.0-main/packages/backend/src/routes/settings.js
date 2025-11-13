import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { SettingsController } from '../controllers/settingsController.js';

const router = express.Router();

// Company Integration secrets (manager only)
router.get(
  '/integrations',
  authenticateToken,
  requireRole('manager'),
  SettingsController.getIntegrations
);
router.post(
  '/integrations',
  authenticateToken,
  requireRole('manager'),
  [
    body('facebookChatId').optional().isString(),
    body('instagramChatId').optional().isString(),
    body('facebookAccessToken').optional().isString(),
    body('openaiApiKey').optional().isString().isLength({ max: 100 }),
    body('googleAccessToken').optional().isString(),
    body('googleRefreshToken').optional().isString(),
  ],
  validate,
  SettingsController.upsertIntegrations
);

// AI Agent settings (non-secret) in Company
router.get('/ai-agent', authenticateToken, requireRole('manager'), SettingsController.getBot);
router.post(
  '/ai-agent',
  authenticateToken,
  requireRole('manager'),
  [
    body('systemInstruction').optional().isString().isLength({ max: 20000 }),
    body('active').optional().isBoolean(),
    body('activeHours.startTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('activeHours.endTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('selectedPromptId').optional().isMongoId(),
    // AI Rules & Role fields
    body('role').optional().isString().isLength({ max: 200 }),
    body('givenInformationRules').optional().isString().isLength({ max: 1000 }),
    body('informationCollectionRules').optional().isString().isLength({ max: 1000 }),
    body('customerSupportRules').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  SettingsController.updateBot
);

// Company profile
router.get('/company', authenticateToken, requireRole('manager'), SettingsController.getCompany);
router.post(
  '/company',
  authenticateToken,
  requireRole('manager'),
  SettingsController.updateCompany
);

// Meta integration management
router.get(
  '/meta',
  authenticateToken,
  requireRole('manager'),
  SettingsController.getMetaIntegration
);
router.post(
  '/meta/connect',
  authenticateToken,
  requireRole('manager'),
  [
    body('platform').isIn(['facebook', 'instagram']),
    body('pageId').isString().notEmpty(),
    body('accessToken').isString().notEmpty(),
  ],
  validate,
  SettingsController.updateMetaIntegration
);
router.post(
  '/meta/disconnect',
  authenticateToken,
  requireRole('manager'),
  [body('platform').isIn(['facebook', 'instagram'])],
  validate,
  SettingsController.disconnectMetaIntegration
);

// New: connect a single FB page with page token, subscribe app, and save tokens
router.post(
  '/meta/page/connect',
  authenticateToken,
  requireRole('manager'),
  [
    body('pageId').isString().notEmpty(),
    // Allow either a direct pageAccessToken or a systemUserAccessToken to derive a page token
    body('pageAccessToken').optional().isString(),
    // Also accept userAccessToken alias from frontend/auth flows
    body('userAccessToken').optional().isString(),
    body('systemUserAccessToken').optional().isString(),
    body('pageName').optional().isString(),
    body('pageCategory').optional().isString(),
  ],
  validate,
  SettingsController.connectMetaPage
);

export default router;
