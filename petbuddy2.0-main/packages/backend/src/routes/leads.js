import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, query, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  convertLeadToCustomer,
  deleteLead,
  updateLeadMessageTracking,
  toggleBotSuspension,
  getLeadStatistics,
} from '../controllers/lead.controller.js';

const router = express.Router();

// Rate limiting for lead operations
const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests to lead endpoints, please try again later.',
});

// Validation schemas
const createLeadValidation = [
  body('companyId').isMongoId().withMessage('Valid companyId is required'),
  body('source')
    .isIn(['facebook', 'instagram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid source'),
  body('fullName').optional().isString().trim().isLength({ max: 100 }),
  body('phone').optional().isString().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'converted', 'lost'])
    .withMessage('Invalid status'),
  body('social.facebookId').optional().isString().trim(),
  body('social.instagramId').optional().isString().trim(),
  body('social.whatsapp').optional().isString().trim(),
  body('interestedServices').optional().isArray(),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
];

const getLeadsValidation = [
  query('companyId').isMongoId().withMessage('Valid companyId is required'),
  query('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'converted', 'lost'])
    .withMessage('Invalid status'),
  query('source')
    .optional()
    .isIn(['facebook', 'instagram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid source'),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('skip').optional().isInt({ min: 0 }).toInt(),
  query('search').optional().isString().trim(),
];

const updateLeadValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('fullName').optional().isString().trim().isLength({ max: 100 }),
  body('phone').optional().isString().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'converted', 'lost'])
    .withMessage('Invalid status'),
  body('interestedServices').optional().isArray(),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
];

const convertLeadValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('customerId').isMongoId().withMessage('Valid customerId is required'),
];

const toggleBotValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('suspend').isBoolean().withMessage('suspend must be a boolean'),
  body('suspendUntil').optional().isISO8601().withMessage('Invalid date format'),
];

// Routes

// Create a new lead
router.post(
  '/',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  createLeadValidation,
  validate,
  leadLimiter,
  createLead
);

// Get all leads for a company
router.get(
  '/',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  getLeadsValidation,
  validate,
  leadLimiter,
  getLeads
);

// Get lead statistics
router.get(
  '/statistics',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  [query('companyId').isMongoId().withMessage('Valid companyId is required')],
  validate,
  leadLimiter,
  getLeadStatistics
);

// Get a single lead by ID
router.get(
  '/:id',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  [param('id').isMongoId().withMessage('Valid lead ID is required')],
  validate,
  leadLimiter,
  getLeadById
);

// Update a lead
router.put(
  '/:id',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  updateLeadValidation,
  validate,
  leadLimiter,
  updateLead
);

// Convert lead to customer
router.post(
  '/:id/convert',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  convertLeadValidation,
  validate,
  leadLimiter,
  convertLeadToCustomer
);

// Update lead message tracking
router.post(
  '/:id/message-tracking',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  [param('id').isMongoId().withMessage('Valid lead ID is required')],
  validate,
  leadLimiter,
  updateLeadMessageTracking
);

// Toggle bot suspension for a lead
router.post(
  '/:id/bot-suspension',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  toggleBotValidation,
  validate,
  leadLimiter,
  toggleBotSuspension
);

// Delete a lead
router.delete(
  '/:id',
  authenticateToken,
  requireRole('manager'),
  [param('id').isMongoId().withMessage('Valid lead ID is required')],
  validate,
  leadLimiter,
  deleteLead
);

export default router;
