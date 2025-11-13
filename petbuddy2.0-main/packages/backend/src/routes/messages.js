import express from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  addMessage,
  getCompanyInstagramCustomers,
  getMessagesByCustomer,
  getMessageById,
  updateMessage,
  deleteMessage,
  markMessagesRead,
} from '../controllers/message.controller.js';

const router = express.Router();

// Rate limiting for message operations
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests to message endpoints, please try again later.',
});

// Common validations
const addMessageValidation = [
  body('company_id').isMongoId().withMessage('Valid company_id is required'),
  body('contact_id').isMongoId().withMessage('Valid contact_id is required'),
  body('role').isIn(['user', 'operator', 'assistant']).withMessage('Invalid role'),
  body('platform')
    .isIn(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
  body('direction').isIn(['inbound', 'outbound']).withMessage('Invalid direction'),
  body('content').optional().isString().trim().isLength({ max: 5000 }),
];

const getMessagesValidation = [
  body('contact_id').isMongoId().withMessage('Valid contact_id is required'),
  body('platform')
    .optional()
    .isIn(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
  body('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
];

const getCompanyCustomersValidation = [
  body('company_id').isMongoId().withMessage('Valid company_id is required'),
  body('platform')
    .optional()
    .isIn(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
  body('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  body('skip').optional().isInt({ min: 0 }).toInt(),
];

const markReadValidation = [
  body('contact_id').isMongoId().withMessage('Valid contact_id is required'),
  body('platform')
    .optional()
    .isIn(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'])
    .withMessage('Invalid platform'),
];

// Routes
router.post(
  '/',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  addMessageValidation,
  validate,
  messageLimiter,
  addMessage
);

router.post(
  '/list-by-customer',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  getMessagesValidation,
  validate,
  messageLimiter,
  getMessagesByCustomer
);

router.post(
  '/company-customers',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  getCompanyCustomersValidation,
  validate,
  messageLimiter,
  getCompanyInstagramCustomers
);

router.post(
  '/mark-read',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  markReadValidation,
  validate,
  messageLimiter,
  markMessagesRead
);

router.post(
  '/get-by-id',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  [body('_id').isMongoId().withMessage('Valid message _id is required')],
  validate,
  messageLimiter,
  getMessageById
);

router.put(
  '/update',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  [body('_id').isMongoId().withMessage('Valid message _id is required')],
  validate,
  messageLimiter,
  updateMessage
);

router.delete(
  '/delete',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  [body('_id').isMongoId().withMessage('Valid message _id is required')],
  validate,
  messageLimiter,
  deleteMessage
);

export default router;
