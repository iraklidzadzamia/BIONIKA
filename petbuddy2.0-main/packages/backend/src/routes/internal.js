import express from 'express';
import { body } from 'express-validator';
import { authenticateInternalService } from '../middleware/internalAuth.js';
import { validate } from '../middleware/validate.js';
import { InternalSocketController } from '../controllers/internalSocketController.js';

const router = express.Router();

// All internal routes require internal service authentication
router.use(authenticateInternalService);

/**
 * POST /api/v1/internal/socket/appointment-created
 * Emit appointment:created socket event
 * Used by MetaBot when BookingService socket imports fail
 */
router.post(
  '/socket/appointment-created',
  [
    body('appointmentId')
      .notEmpty()
      .withMessage('appointmentId is required')
      .isMongoId()
      .withMessage('appointmentId must be a valid MongoDB ObjectId'),
  ],
  validate,
  InternalSocketController.emitAppointmentCreated
);

/**
 * POST /api/v1/internal/socket/appointment-updated
 * Emit appointment:updated socket event
 * Used by MetaBot when BookingService socket imports fail
 */
router.post(
  '/socket/appointment-updated',
  [
    body('appointmentId')
      .notEmpty()
      .withMessage('appointmentId is required')
      .isMongoId()
      .withMessage('appointmentId must be a valid MongoDB ObjectId'),
  ],
  validate,
  InternalSocketController.emitAppointmentUpdated
);

/**
 * POST /api/v1/internal/socket/appointment-canceled
 * Emit appointment:canceled socket event
 * Used by MetaBot when BookingService socket imports fail
 */
router.post(
  '/socket/appointment-canceled',
  [
    body('appointmentId')
      .notEmpty()
      .withMessage('appointmentId is required')
      .isMongoId()
      .withMessage('appointmentId must be a valid MongoDB ObjectId'),
  ],
  validate,
  InternalSocketController.emitAppointmentCanceled
);

export default router;
