import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { LocationController } from '../controllers/locationController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticateToken);

router.get('/', LocationController.list);
router.get(
  '/:id',
  param('id').isMongoId().withMessage('Valid location ID is required'),
  validate,
  LocationController.getById
);
router.post('/', requireRole('manager'), LocationController.create);
router.put('/:id', requireRole('manager'), LocationController.update);
router.delete('/:id', requireRole('manager'), LocationController.remove);

export default router;
