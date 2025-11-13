import { validationResult, body } from 'express-validator';

/**
 * Middleware to check validation results
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value,
        })),
      },
    });
  }

  next();
};

/**
 * Common validation rules
 */
export const commonValidations = {
  id: {
    in: ['params'],
    isMongoId: true,
    errorMessage: 'Invalid ID format',
  },

  pagination: {
    page: {
      in: ['query'],
      optional: true,
      isInt: { min: 1 },
      toInt: true,
      errorMessage: 'Page must be a positive integer',
    },
    size: {
      in: ['query'],
      optional: true,
      isInt: { min: 1, max: 100 },
      toInt: true,
      errorMessage: 'Size must be between 1 and 100',
    },
    sort: {
      in: ['query'],
      optional: true,
      isString: true,
      errorMessage: 'Sort field must be a string',
    },
    dir: {
      in: ['query'],
      optional: true,
      isIn: { options: [['asc', 'desc']] },
      errorMessage: 'Sort direction must be asc or desc',
    },
  },

  dateRange: {
    dateFrom: {
      in: ['query'],
      optional: true,
      isISO8601: true,
      errorMessage: 'Date from must be a valid ISO date',
    },
    dateTo: {
      in: ['query'],
      optional: true,
      isISO8601: true,
      errorMessage: 'Date to must be a valid ISO date',
    },
  },
};

/**
 * Email validation rules
 */
export const emailValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase()
    .trim(),
];

/**
 * User registration validation rules
 */
export const userRegistrationValidation = [
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase()
    .trim(),

  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('role')
    .optional()
    .isIn(['manager', 'receptionist', 'groomer'])
    .withMessage('Role must be one of: manager, receptionist, groomer'),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be 20 characters or less'),
];

/**
 * Company registration validation rules
 */
export const companyRegistrationValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase()
    .trim(),

  body('phone')
    .optional()
    .trim()
    .isLength({ min: 7 })
    .withMessage('Phone number must be at least 7 digits when provided'),

  body('website').optional().isURL().withMessage('Please provide a valid website URL'),

  body('timezone').optional().isString().withMessage('Timezone must be a string'),

  body('businessTypes').optional().isArray().withMessage('Business types must be an array'),

  body('mainCurrency').optional().isString().withMessage('Main currency must be a string'),
];
