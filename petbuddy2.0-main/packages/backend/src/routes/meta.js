/**
 * Meta Integration Routes
 * Clean, RESTful routes for Facebook and Instagram integration
 */
import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { MetaIntegrationController } from '../controllers/metaIntegrationController.js';

const router = express.Router();

// All routes require authentication and manager role
router.use(authenticateToken, requireRole('manager'));

/**
 * GET /api/v1/meta
 * Get Meta integration status (Facebook and Instagram)
 */
router.get('/', MetaIntegrationController.getStatus);

/**
 * POST /api/v1/meta/facebook/connect
 * Connect a Facebook page
 * Body: { pageId, pageName, pageCategory, userAccessToken, instagramChatId? }
 */
router.post(
  '/facebook/connect',
  [
    body('pageId').isString().trim().notEmpty().withMessage('pageId is required'),
    body('pageName').optional().isString().trim(),
    body('pageCategory').optional().isString().trim(),
    body('userAccessToken').isString().trim().notEmpty().withMessage('userAccessToken is required'),
    body('instagramChatId').optional().isString().trim(),
  ],
  validate,
  MetaIntegrationController.connectFacebook
);

/**
 * POST /api/v1/meta/facebook/disconnect
 * Disconnect Facebook integration
 */
router.post('/facebook/disconnect', MetaIntegrationController.disconnectFacebook);

/**
 * POST /api/v1/meta/instagram/disconnect
 * Disconnect Instagram integration
 */
router.post('/instagram/disconnect', MetaIntegrationController.disconnectInstagram);

export default router;
