import express from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  getUnifiedConversations,
  getConversationMessages,
  markConversationRead,
  toggleBotSuspended,
} from '../controllers/conversation.controller.js';

const router = express.Router();

// Rate limiting
const conversationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests to conversation endpoints, please try again later.',
});

// Validations
const getConversationsValidation = [
  body('company_id').isMongoId().withMessage('Valid company_id is required'),
  body('platform')
    .optional()
    .isIn(['all', 'instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
  body('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
];

const getMessagesValidation = [
  body('contactId').isMongoId().withMessage('Valid contactId is required'),
  body('platform')
    .optional()
    .isIn(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
  body('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
];

const markReadValidation = [
  body('contactId').isMongoId().withMessage('Valid contactId is required'),
  body('platform')
    .optional()
    .isIn(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
];

const toggleBotSuspendedValidation = [
  body('contactId').isMongoId().withMessage('Valid contactId is required'),
];

// Routes

// Get unified conversations list (customers + leads)
router.post(
  '/list',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  getConversationsValidation,
  validate,
  conversationLimiter,
  getUnifiedConversations
);

// Get messages for a specific conversation
router.post(
  '/messages',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  getMessagesValidation,
  validate,
  conversationLimiter,
  getConversationMessages
);

// Mark conversation as read
router.post(
  '/mark-read',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  markReadValidation,
  validate,
  conversationLimiter,
  markConversationRead
);

// Toggle bot suspended for a contact
router.post(
  '/toggle-bot-suspended',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  toggleBotSuspendedValidation,
  validate,
  conversationLimiter,
  toggleBotSuspended
);

export default router;
