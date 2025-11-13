import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { AIPromptController } from '../controllers/aiPromptController.js';

const router = express.Router();

// Public endpoints (no authentication required for discovery)
router.get('/defaults', AIPromptController.getDefaultPrompts);
router.get('/categories/:category', AIPromptController.getPromptsByCategory);
router.get('/search', [
  query('q').optional().isString().trim(),
  query('category').optional().isString().trim(),
  query('businessType').optional().isString().trim(),
  query('tags').optional().isString().trim(),
], validate, AIPromptController.searchPrompts);

// Protected endpoints (authentication required)
router.get('/', [
  query('category').optional().isString().trim(),
  query('businessType').optional().isString().trim(),
  query('tags').optional().isString().trim(),
  query('search').optional().isString().trim(),
  query('isActive').optional().isBoolean(),
  query('isDefault').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['name', 'category', 'businessType', 'createdAt', 'usageCount']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], validate, AIPromptController.getPrompts);

router.get('/stats', authenticateToken, requireRole('admin'), AIPromptController.getPromptStats);

router.get('/:id', [
  param('id').isMongoId(),
], validate, AIPromptController.getPromptById);

router.get('/:id/preview', [
  param('id').isMongoId(),
], validate, AIPromptController.getPromptPreview);

router.post('/:id/usage', [
  param('id').isMongoId(),
], validate, AIPromptController.incrementUsage);

export default router;
