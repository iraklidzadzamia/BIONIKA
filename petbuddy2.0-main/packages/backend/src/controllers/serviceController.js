;
import logger from '../utils/logger.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { ServiceCategory, STAFF_ROLE_VALUES } from '@petbuddy/shared';

export class ServiceController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { q, species, active } = req.query;
      const filter = { companyId };

      if (q) {
        const escaped = escapeRegex(q);
        filter.name = { $regex: escaped, $options: 'i' };
      }

      if (species) {
        filter.species = species;
      }

      // Filter by active status if provided
      if (active !== undefined) {
        filter.active = active === 'true' || active === true;
      }

      const services = await ServiceCategory.find(filter)
        .sort({ name: 1 })
        .select('name description species requiresBath active color allowedRoles')
        .lean();
      res.json({ items: services });
    } catch (error) {
      logger.error('List services error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch services' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { name, description, species, requiresBath, color, allowedRoles } = req.body || {};

      if (!name || !species) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'name and species are required',
          },
        });
      }

      const allowedSpecies = ['dog', 'cat', 'dog&cat', 'other'];
      if (!allowedSpecies.includes(species)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_SPECIES',
            message: `species must be one of: ${allowedSpecies.join(', ')}`,
          },
        });
      }

      // Validate allowedRoles if provided
      if (allowedRoles !== undefined) {
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
          return res.status(400).json({
            error: {
              code: 'INVALID_ALLOWED_ROLES',
              message: 'allowedRoles must be a non-empty array',
            },
          });
        }
        const invalidRoles = allowedRoles.filter(role => !STAFF_ROLE_VALUES.includes(role));
        if (invalidRoles.length > 0) {
          return res.status(400).json({
            error: {
              code: 'INVALID_ALLOWED_ROLES',
              message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${STAFF_ROLE_VALUES.join(', ')}`,
            },
          });
        }
      }

      // Validate color if provided
      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_COLOR',
            message: 'color must be a valid hex color code (e.g., #6366f1)',
          },
        });
      }

      const payload = {
        companyId,
        name: String(name).trim(),
        description: description ? String(description).trim() : undefined,
        species,
        requiresBath: Boolean(requiresBath),
        color: color || undefined,
        allowedRoles: allowedRoles || ['groomer'],
      };

      const service = await ServiceCategory.create(payload);
      logger.info(`Service category created: ${service.name} for company: ${companyId}`);
      res.status(201).json({ service });
    } catch (error) {
      logger.error('Create service error:', error);
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create service' } });
    }
  }

  static async update(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const { name, description, species, requiresBath, active, color, allowedRoles } = req.body || {};

      const update = {};
      if (name !== undefined) update.name = String(name).trim();
      if (description !== undefined)
        update.description = description ? String(description).trim() : undefined;
      if (species !== undefined) {
        const allowedSpecies = ['dog', 'cat', 'dog&cat', 'other'];
        if (!allowedSpecies.includes(species)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_SPECIES',
              message: `species must be one of: ${allowedSpecies.join(', ')}`,
            },
          });
        }
        update.species = species;
      }
      if (requiresBath !== undefined) update.requiresBath = Boolean(requiresBath);
      if (active !== undefined) update.active = Boolean(active);

      // Validate and update color
      if (color !== undefined) {
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_COLOR',
              message: 'color must be a valid hex color code (e.g., #6366f1)',
            },
          });
        }
        update.color = color || undefined;
      }

      // Validate and update allowedRoles
      if (allowedRoles !== undefined) {
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
          return res.status(400).json({
            error: {
              code: 'INVALID_ALLOWED_ROLES',
              message: 'allowedRoles must be a non-empty array',
            },
          });
        }
        const invalidRoles = allowedRoles.filter(role => !STAFF_ROLE_VALUES.includes(role));
        if (invalidRoles.length > 0) {
          return res.status(400).json({
            error: {
              code: 'INVALID_ALLOWED_ROLES',
              message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${STAFF_ROLE_VALUES.join(', ')}`,
            },
          });
        }
        update.allowedRoles = allowedRoles;
      }

      const svc = await ServiceCategory.findOneAndUpdate(
        { _id: id, companyId },
        { $set: update },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

      if (!svc) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Service not found',
          },
        });
      }

      logger.info(`Service updated: ${svc.name}`);
      res.json({ service: svc });
    } catch (error) {
      logger.error('Update service error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update service' } });
    }
  }

  static async remove(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;

      const svc = await ServiceCategory.findOneAndDelete({ _id: id, companyId }).lean();
      if (!svc) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Service not found',
          },
        });
      }
      res.json({ message: 'Service deleted', service: svc });
    } catch (error) {
      logger.error('Delete service error:', error);
      res
        .status(500)
        .json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete service' } });
    }
  }
}
