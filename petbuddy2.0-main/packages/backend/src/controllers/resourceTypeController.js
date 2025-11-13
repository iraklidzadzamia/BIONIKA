import ResourceType from '../models/ResourceType.js';
import logger from '../utils/logger.js';

export class ResourceTypeController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { category, includeResources } = req.query;

      const filter = { companyId };
      if (category) {
        filter.category = category;
      }

      let query = ResourceType.find(filter).sort({ category: 1, name: 1 });

      if (String(includeResources).toLowerCase() === 'true') {
        query = query.populate({
          path: 'resources',
          select: 'label capacity active resourceTypeId',
          options: { sort: { label: 1 } },
        });
      }

      const items = await query.lean();

      res.json({ items });
    } catch (error) {
      logger.error('List resource types error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch resource types' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { name, description, category, color, icon, active } = req.body || {};

      if (!name || !category) {
        return res
          .status(400)
          .json({ error: { code: 'MISSING_FIELDS', message: 'name and category are required' } });
      }

      // Validate category
      const validCategories = ['equipment', 'space', 'staff', 'supply', 'other'];
      if (!validCategories.includes(category)) {
        return res
          .status(400)
          .json({ error: { code: 'INVALID_CATEGORY', message: 'Invalid category' } });
      }

      const resourceType = await ResourceType.create({
        companyId,
        name: String(name).trim(),
        description: description ? String(description).trim() : undefined,
        category,
        color: color || '#6B7280',
        icon: icon || 'cube',
        active: active !== undefined ? Boolean(active) : true,
      });

      res.status(201).json({ resourceType });
    } catch (error) {
      logger.error('Create resource type error:', error);
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create resource type' } });
    }
  }

  static async update(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const { name, description, category, color, icon, active } = req.body || {};

      const update = {};
      if (name !== undefined) update.name = String(name).trim();
      if (description !== undefined)
        update.description = description ? String(description).trim() : undefined;
      if (category !== undefined) {
        const validCategories = ['equipment', 'space', 'staff', 'supply', 'other'];
        if (!validCategories.includes(category)) {
          return res
            .status(400)
            .json({ error: { code: 'INVALID_CATEGORY', message: 'Invalid category' } });
        }
        update.category = category;
      }
      if (color !== undefined) update.color = String(color).trim();
      if (icon !== undefined) update.icon = String(icon).trim();
      if (active !== undefined) update.active = Boolean(active);

      const resourceType = await ResourceType.findOneAndUpdate(
        { _id: id, companyId },
        { $set: update },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

      if (!resourceType) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Resource type not found' } });
      }
      res.json({ resourceType });
    } catch (error) {
      logger.error('Update resource type error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update resource type' } });
    }
  }

  static async remove(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;

      // Check if any resources are using this resource type
      const Resource = (await import('../models/Resource.js')).default;
      const resourceCount = await Resource.countDocuments({ resourceTypeId: id, companyId });

      if (resourceCount > 0) {
        return res.status(400).json({
          error: {
            code: 'IN_USE',
            message: `Cannot delete resource type. ${resourceCount} resources are using it.`,
          },
        });
      }

      const resourceType = await ResourceType.findOneAndDelete({ _id: id, companyId }).lean();
      if (!resourceType) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Resource type not found' } });
      }
      res.json({ message: 'Resource type deleted', resourceType });
    } catch (error) {
      logger.error('Delete resource type error:', error);
      res
        .status(500)
        .json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete resource type' } });
    }
  }
}
