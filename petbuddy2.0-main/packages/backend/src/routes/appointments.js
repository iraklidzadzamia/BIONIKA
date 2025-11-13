import express from 'express';
import { query, param, body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AppointmentController } from '../controllers/appointmentController.js';
import { validateLocationOwnership } from '../middleware/validateLocation.js';

const router = express.Router();

// Rate limiting
const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many appointment requests from this IP, please try again later.',
});

// Validation rules
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .toInt()
    .withMessage('Limit must be between 1 and 500'),
  query('sortBy')
    .optional()
    .isIn([
      'startTime',
      'customerName',
      'petName',
      'serviceName',
      'staffName',
      'status',
      'createdAt',
    ])
    .withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
];

const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid ISO date'),
];

const appointmentValidation = [
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('staffId').optional().isMongoId().withMessage('Valid staff ID is required'),
  body('start').isISO8601().toDate().withMessage('Start must be a valid ISO date'),
  body('end').isISO8601().toDate().withMessage('End must be a valid ISO date'),
  body('petId').isMongoId().withMessage('Valid pet ID is required'),
  body('serviceId').isMongoId().withMessage('Valid service ID is required'),
  body('serviceItemId').optional().isMongoId().withMessage('Invalid serviceItemId'),
  body('locationId').isMongoId().withMessage('Valid location ID is required'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
];

const updateAppointmentValidation = [
  body('start').optional().isISO8601().toDate().withMessage('Start must be a valid ISO date'),
  body('end').optional().isISO8601().toDate().withMessage('End must be a valid ISO date'),
  body('staffId').optional().isMongoId().withMessage('Valid staff ID is required'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
];

const statusValidation = [
  body('status')
    .isIn(['scheduled', 'checked_in', 'in_progress', 'completed', 'canceled', 'no_show'])
    .withMessage('Invalid status'),
  body('reason')
    .if(body('status').isIn(['canceled', 'no_show']))
    .notEmpty()
    .withMessage('Reason is required when canceling or marking as no-show'),
];

// Routes
router.get(
  '/',
  paginationValidation,
  dateRangeValidation,
  validate,
  authenticateToken,
  requireRole('manager', 'receptionist', 'groomer'),
  appointmentLimiter,
  AppointmentController.getAppointments
);

router.post(
  '/',
  appointmentValidation,
  validate,
  authenticateToken,
  requireRole('manager', 'receptionist'),
  appointmentLimiter,
  validateLocationOwnership,
  AppointmentController.createAppointment
);

router.get(
  '/:id',
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  validate,
  authenticateToken,
  requireRole('manager', 'receptionist', 'groomer'),
  appointmentLimiter,
  AppointmentController.getAppointment
);

router.put(
  '/:id',
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  updateAppointmentValidation,
  validate,
  authenticateToken,
  requireRole('manager', 'receptionist'),
  appointmentLimiter,
  AppointmentController.updateAppointment
);

router.patch(
  '/:id/status',
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  statusValidation,
  validate,
  authenticateToken,
  requireRole('manager', 'receptionist', 'groomer'),
  appointmentLimiter,
  AppointmentController.updateAppointmentStatus
);

// Get appointments by customer (for customer portal/chatbot)
router.get(
  '/customer/:customerId',
  param('customerId').isMongoId().withMessage('Valid customer ID is required'),
  query('status').optional().isIn(['scheduled', 'checked_in', 'in_progress', 'completed', 'canceled', 'no_show']),
  query('upcoming').optional().isBoolean().withMessage('Upcoming must be a boolean'),
  validate,
  authenticateToken,
  appointmentLimiter,
  AppointmentController.getCustomerAppointments
);

router.delete(
  '/:id',
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  body('reason').notEmpty().withMessage('Cancel reason is required'),
  validate,
  authenticateToken,
  requireRole('manager', 'receptionist'),
  appointmentLimiter,
  AppointmentController.cancelAppointment
);

export default router;
