;
import logger from '../utils/logger.js';
import { ServiceItem } from '@petbuddy/shared';

export class ServiceItemController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { serviceId } = req.params;

      const variants = await ServiceItem.find({ companyId, serviceCategoryId: serviceId })
        .sort({ size: 1, coatType: 1 })
        .select(
          'size label coatType durationMinutes price active requiredResources'
        )
        .lean();

      res.json({ items: variants });
    } catch (error) {
      logger.error('List service items error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch service items' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { serviceId } = req.params;
      const {
        size,
        label,
        coatType,
        price,
        durationMinutes,
        requiredResources,
      } = req.body || {};

      if (!size || price === undefined) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'size and price are required',
          },
        });
      }

      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PRICE',
            message: 'price must be a non-negative number',
          },
        });
      }

      // Validate requiredResources if provided
      if (requiredResources !== undefined) {
        if (!Array.isArray(requiredResources)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_REQUIRED_RESOURCES',
              message: 'requiredResources must be an array',
            },
          });
        }
        for (const rr of requiredResources) {
          if (!rr || !rr.resourceTypeId) {
            return res.status(400).json({
              error: {
                code: 'INVALID_REQUIRED_RESOURCES',
                message: 'resourceTypeId is required in each requiredResources entry',
              },
            });
          }
          const qty = rr.quantity ?? 1;
          const dur = rr.durationMinutes;
          if (!Number.isFinite(qty) || qty < 1) {
            return res.status(400).json({
              error: { code: 'INVALID_RESOURCE_QUANTITY', message: 'quantity must be >= 1' },
            });
          }
          if (!Number.isFinite(dur) || dur < 10 || dur > 480) {
            return res.status(400).json({
              error: {
                code: 'INVALID_RESOURCE_DURATION',
                message: 'durationMinutes must be between 10 and 480',
              },
            });
          }
        }
      }

      // Validate or derive durationMinutes
      let finalDuration = Number(durationMinutes);
      if (!Number.isFinite(finalDuration)) {
        if (Array.isArray(requiredResources) && requiredResources.length > 0) {
          finalDuration = requiredResources.reduce(
            (sum, rr) => sum + (Number(rr?.durationMinutes) || 0),
            0
          );
        }
      }
      if (!Number.isFinite(finalDuration) || finalDuration < 10 || finalDuration > 480) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DURATION',
            message: 'durationMinutes is required (10-480) or derive it from requiredResources',
          },
        });
      }

      const allowedSizes = ['S', 'M', 'L', 'XL', 'all'];
      if (!allowedSizes.includes(size)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_SIZE',
            message: `size must be one of: ${allowedSizes.join(', ')}`,
          },
        });
      }

      const allowedCoatTypes = [
        'short',
        'medium',
        'long',
        'curly',
        'double',
        'wire',
        'hairless',
        'unknown',
        'all',
      ];
      if (!allowedCoatTypes.includes(coatType)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_COAT_TYPE',
            message: `coatType must be one of: ${allowedCoatTypes.join(', ')}`,
          },
        });
      }

      // Check for duplicate size/coatType combination
      const exists = await ServiceItem.findOne({
        companyId,
        serviceCategoryId: serviceId,
        size,
        coatType,
      });

      if (exists) {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_VARIANT',
            message: 'A variant with this size and coat type already exists for this service',
          },
        });
      }

      const variant = await ServiceItem.create({
        companyId,
        serviceCategoryId: serviceId,
        size: String(size).toUpperCase(),
        label: label ? String(label).trim() : undefined,
        coatType: coatType || 'all',
        durationMinutes: finalDuration,
        price: parsedPrice,
        requiredResources: requiredResources || [],
      });

      logger.info(
        `Service item created: ${variant.size}/${variant.coatType} for service: ${serviceId}`
      );
      res.status(201).json({ variant });
    } catch (error) {
      logger.error('Create service item error:', error);
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create service item' } });
    }
  }

  static async update(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const update = req.body || {};

      const existing = await ServiceItem.findOne({ _id: id, companyId });
      if (!existing) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Service item not found',
          },
        });
      }

      // If size or coatType is being updated, check for duplicates
      if (update.size || update.coatType) {
        const dup = await ServiceItem.findOne({
          companyId,
          serviceCategoryId: existing.serviceCategoryId,
          size: update.size || existing.size,
          coatType: update.coatType || existing.coatType,
          _id: { $ne: id },
        });

        if (dup) {
          return res.status(400).json({
            error: {
              code: 'DUPLICATE_VARIANT',
              message: 'A variant with this size and coat type already exists for this service',
            },
          });
        }
      }

      // Validate requiredResources if updating
      if (update.requiredResources !== undefined) {
        if (!Array.isArray(update.requiredResources)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_REQUIRED_RESOURCES',
              message: 'requiredResources must be an array',
            },
          });
        }
        for (const rr of update.requiredResources) {
          if (!rr || !rr.resourceTypeId) {
            return res.status(400).json({
              error: {
                code: 'INVALID_REQUIRED_RESOURCES',
                message: 'resourceTypeId is required in each requiredResources entry',
              },
            });
          }
          const qty = rr.quantity ?? 1;
          const dur = rr.durationMinutes;
          if (!Number.isFinite(qty) || qty < 1) {
            return res.status(400).json({
              error: { code: 'INVALID_RESOURCE_QUANTITY', message: 'quantity must be >= 1' },
            });
          }
          if (!Number.isFinite(dur) || dur < 10 || dur > 480) {
            return res.status(400).json({
              error: {
                code: 'INVALID_RESOURCE_DURATION',
                message: 'durationMinutes must be between 10 and 480',
              },
            });
          }
        }
      }

      // Validate numeric fields
      if (update.durationMinutes !== undefined) {
        const d = Number(update.durationMinutes);
        if (!Number.isFinite(d) || d < 10 || d > 480) {
          return res.status(400).json({
            error: {
              code: 'INVALID_DURATION',
              message: 'durationMinutes must be between 10 and 480',
            },
          });
        }
      }

      if (update.price !== undefined) {
        const parsedPrice = Number(update.price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({
            error: {
              code: 'INVALID_PRICE',
              message: 'price must be a non-negative number',
            },
          });
        }
        update.price = parsedPrice;
      }

      // If requiredResources updated but durationMinutes not provided, derive it
      if (update.requiredResources !== undefined && update.durationMinutes === undefined) {
        const derived = update.requiredResources.reduce(
          (sum, rr) => sum + (Number(rr?.durationMinutes) || 0),
          0
        );

        // Validate the derived durationMinutes
        if (!Number.isFinite(derived) || derived < 10 || derived > 480) {
          return res.status(400).json({
            error: {
              code: 'INVALID_DURATION',
              message: 'Derived durationMinutes from requiredResources must be between 10 and 480',
            },
          });
        }

        update.durationMinutes = derived;
      }

      const variant = await ServiceItem.findOneAndUpdate(
        { _id: id, companyId },
        { $set: update },
        { new: true, runValidators: true }
      );

      logger.info(`Service item updated: ${variant.size}/${variant.coatType}`);
      res.json({ variant });
    } catch (error) {
      logger.error('Update service item error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update service item' } });
    }
  }

  static async remove(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;

      const variant = await ServiceItem.findOneAndDelete({ _id: id, companyId }).lean();
      if (!variant) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Service item not found',
          },
        });
      }

      logger.info(`Service item deleted: ${variant.size}/${variant.coatType}`);
      res.json({ message: 'Service item deleted successfully' });
    } catch (error) {
      logger.error('Delete service item error:', error);
      res
        .status(500)
        .json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete service item' } });
    }
  }
}
