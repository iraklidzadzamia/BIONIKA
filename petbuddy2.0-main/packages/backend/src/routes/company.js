import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanyServices,
  getCompanyServicesWithItems,
  getAllServiceItemsWithCategories,
  createService,
  updateService,
  deleteService,
  updateWorkingHours,
  getWorkingHours,
} from '../controllers/companyController.js';
import { ResourceTypeController } from '../controllers/resourceTypeController.js';
import { ResourceController } from '../controllers/resourceController.js';

const router = express.Router();

// All routes require authentication and manager role
router.use(authenticateToken);
// Allow manager, receptionist, and groomer roles
router.use(requireRole('manager', 'receptionist', 'groomer'));

// Company profile routes
router.get('/:companyId', getCompanyProfile);
router.put('/:companyId', updateCompanyProfile);

// Company services routes
router.get('/:companyId/services', getCompanyServices);
router.get('/:companyId/services-with-items', getCompanyServicesWithItems);
router.get('/:companyId/service-items-with-categories', getAllServiceItemsWithCategories);
router.post('/:companyId/services', createService);
router.put('/:companyId/services/:serviceId', updateService);
router.delete('/:companyId/services/:serviceId', deleteService);

// Company resource types routes
router.get('/:companyId/resource-types', ResourceTypeController.list);
router.post('/:companyId/resource-types', ResourceTypeController.create);
router.put('/:companyId/resource-types/:id', ResourceTypeController.update);
router.delete('/:companyId/resource-types/:id', ResourceTypeController.remove);

// Company resources routes
router.get('/:companyId/resources', ResourceController.list);
router.post('/:companyId/resources', ResourceController.create);
router.put('/:companyId/resources/:id', ResourceController.update);
router.delete('/:companyId/resources/:id', ResourceController.remove);

// Company working hours routes
router.get('/:companyId/working-hours', getWorkingHours);
router.put('/:companyId/working-hours', updateWorkingHours);

export default router;
