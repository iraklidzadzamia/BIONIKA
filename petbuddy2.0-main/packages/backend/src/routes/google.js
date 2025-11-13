import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { GoogleController } from '../controllers/googleController.js';

const router = express.Router();

router.get('/auth/url', authenticateToken, requireRole('manager'), GoogleController.getAuthUrl);
router.get('/oauth/callback', GoogleController.oauthCallback);
router.get('/calendars', authenticateToken, requireRole('manager'), GoogleController.listCalendars);
router.post(
  '/calendar/select',
  authenticateToken,
  requireRole('manager'),
  [body('calendarId').isString().notEmpty()],
  validate,
  GoogleController.selectCalendar
);
router.post('/disconnect', authenticateToken, requireRole('manager'), GoogleController.disconnect);

router.get('/settings', authenticateToken, requireRole('manager'), GoogleController.getSettings);
router.post(
  '/settings/auto-sync',
  authenticateToken,
  requireRole('manager'),
  [body('autoSync').isBoolean()],
  validate,
  GoogleController.updateAutoSync
);

export default router;
