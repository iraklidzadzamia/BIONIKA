import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticateInternalService } from '../middleware/internalAuth.js';
import { emitMessageEvent, emitMessageEventInternal } from '../controllers/socket.controller.js';

const router = express.Router();

// Validation for socket emit endpoint
const emitMessageValidation = [
  body('companyId').isString().withMessage('Valid companyId is required'),
  body('conversationId').isString().withMessage('Valid conversationId is required'),
  body('message').isObject().withMessage('Message object is required'),
  body('message.id').isString().withMessage('Message id is required'),
  body('message.contactId').isString().withMessage('Message contactId is required'),
  body('message.content').optional().isString().withMessage('Message content must be a string'),
  body('message.direction').isIn(['inbound', 'outbound']).withMessage('Invalid message direction'),
  body('message.timestamp').optional().isISO8601().withMessage('Invalid timestamp format'),
];

/**
 * POST /api/v1/socket/emit-message-internal
 * Emit a new message event via Socket.io (INTERNAL SERVICE ENDPOINT)
 * Called by internal services (MetaAndAI) to trigger real-time updates
 * Authentication: API key via x-api-key header
 */
router.post(
  '/emit-message-internal',
  authenticateInternalService,
  emitMessageValidation,
  validate,
  emitMessageEventInternal
);

/**
 * POST /api/v1/socket/emit-message
 * Emit a new message event via Socket.io (LEGACY ENDPOINT)
 * @deprecated - This endpoint is kept for backward compatibility
 * Note: This endpoint has no authentication - consider removing or adding auth
 */
router.post('/emit-message', emitMessageValidation, validate, emitMessageEvent);

export default router;
