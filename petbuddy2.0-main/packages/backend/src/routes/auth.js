import express from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController.js';
import {
  validate,
  companyRegistrationValidation,
  userRegistrationValidation,
} from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';
import { checkAccountLockout } from '../middleware/accountLockout.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

// Custom validation for manager registration that combines company and user validation
const registerManagerValidation = [
  // Company validation
  body('company.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be 2-100 characters'),
  body('company.email').isEmail().normalizeEmail().withMessage('Valid company email is required'),
  body('company.phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Valid phone number must be at least 10 digits'),
  body('company.address')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Company address must be at least 5 characters'),
  body('company.timezone').trim().isLength({ min: 3 }).withMessage('Valid timezone is required'),
  body('company.businessTypes').optional().isArray().withMessage('Business types must be an array'),
  body('company.businessTypes.*')
    .optional()
    .isIn(['grooming', 'vet', 'boarding', 'daycare', 'training', 'other'])
    .withMessage('Invalid business type'),

  // User validation: require either fullName OR firstName+lastName
  body('user').custom(u => {
    if (!u || typeof u !== 'object') {
      throw new Error('User data is required');
    }
    const fullName = (u.fullName || '').toString().trim();
    const firstName = (u.firstName || '').toString().trim();
    const lastName = (u.lastName || '').toString().trim();
    const hasFullName = fullName.length >= 2 && fullName.length <= 100;
    const hasFirstLast = firstName.length >= 2 && lastName.length >= 2;
    if (!hasFullName && !hasFirstLast) {
      throw new Error('Provide fullName (2-100 chars) or firstName and lastName (>=2 chars each)');
    }
    return true;
  }),
  body('user.email').isEmail().normalizeEmail().withMessage('Valid user email is required'),
  body('user.password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('user.color')
    .optional()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage('Color must be a valid hex like #6B7280 or #333'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('companyId')
    .optional()
    .isMongoId()
    .withMessage('companyId must be a valid Mongo ID when provided'),
];

// Allow refresh/logout to use token from either cookie or body
// Make body token optional; controller will handle absence and return proper error
const refreshValidation = [
  body('refreshToken').optional().isString().withMessage('Refresh token must be a string'),
];

const logoutValidation = [
  body('refreshToken').optional().isString().withMessage('Refresh token must be a string'),
];

// Routes
router.post(
  '/register-manager',
  authLimiter,
  registerManagerValidation,
  validate,
  AuthController.registerManager
);
router.post('/login', authLimiter, checkAccountLockout, loginValidation, validate, AuthController.login);
router.post('/refresh', refreshValidation, validate, AuthController.refreshToken);
router.post('/logout', logoutValidation, validate, AuthController.logout);

export default router;
