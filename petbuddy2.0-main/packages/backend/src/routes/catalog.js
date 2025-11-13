import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { CustomerController } from '../controllers/customerController.js';
import { ServiceController } from '../controllers/serviceController.js';
import { ServiceItemController } from '../controllers/serviceItemController.js';
import { ResourceController } from '../controllers/resourceController.js';
import { PetController } from '../controllers/petController.js';
import { StaffController } from '../controllers/staffController.js';
import { StaffScheduleController } from '../controllers/staffScheduleController.js';
import { validate } from '../middleware/validate.js';
import { body, query } from 'express-validator';
import { validateLocationOwnership } from '../middleware/validateLocation.js';

const router = express.Router();

// All catalog endpoints require authentication; receptionist or manager access
router.get(
  '/customers',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  CustomerController.list
);
router.get(
  '/customers/search/by-phone',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  CustomerController.findByPhone
);
router.post(
  '/customers',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  CustomerController.create
);
router.get(
  '/services',
  authenticateToken,
  requireRole('manager', 'receptionist', 'groomer'),
  ServiceController.list
);
router.post('/services', authenticateToken, requireRole('manager'), ServiceController.create);
router.put('/services/:id', authenticateToken, requireRole('manager'), ServiceController.update);
router.delete('/services/:id', authenticateToken, requireRole('manager'), ServiceController.remove);
// Service items routes
router.get(
  '/services/:serviceId/items',
  authenticateToken,
  requireRole('manager', 'receptionist', 'groomer'),
  ServiceItemController.list
);
router.post(
  '/services/:serviceId/items',
  authenticateToken,
  requireRole('manager'),
  ServiceItemController.create
);
router.put(
  '/service-items/:id',
  authenticateToken,
  requireRole('manager'),
  ServiceItemController.update
);
router.delete(
  '/service-items/:id',
  authenticateToken,
  requireRole('manager'),
  ServiceItemController.remove
);
router.get('/pets', authenticateToken, requireRole('manager', 'receptionist'), PetController.list);
router.post(
  '/pets',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  PetController.create
);
router.get(
  '/staff',
  authenticateToken,
  requireRole('manager', 'receptionist'),
  StaffController.list
);
router.post('/staff', authenticateToken, requireRole('manager'), StaffController.create);
router.put('/staff/:id', authenticateToken, requireRole('manager'), StaffController.update);
router.delete('/staff/:id', authenticateToken, requireRole('manager'), StaffController.remove);
// Staff schedules
router.get(
  '/staff/:id/schedule',
  authenticateToken,
  requireRole('manager'),
  StaffScheduleController.getByUser
);
router.put(
  '/staff/:id/schedule',
  body('locationId').isMongoId().withMessage('Valid location ID is required'),
  authenticateToken,
  requireRole('manager'),
  validateLocationOwnership,
  validate,
  StaffScheduleController.saveForUser
);
// Resources
router.get(
  '/resources',
  query('locationId').optional().isMongoId().withMessage('Valid location ID is required'),
  authenticateToken,
  requireRole('manager', 'receptionist'),
  ResourceController.list
);
router.post(
  '/resources',
  body('locationId').isMongoId().withMessage('Valid location ID is required'),
  authenticateToken,
  requireRole('manager'),
  validateLocationOwnership,
  validate,
  ResourceController.create
);
router.put('/resources/:id', authenticateToken, requireRole('manager'), ResourceController.update);
router.delete(
  '/resources/:id',
  authenticateToken,
  requireRole('manager'),
  ResourceController.remove
);

export default router;
