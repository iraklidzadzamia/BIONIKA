import Resource from '../models/Resource.js';
import ResourceType from '../models/ResourceType.js';
import logger from '../utils/logger.js';

export class ResourceController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { locationId } = req.query || {};
      const filter = { companyId };
      if (locationId) filter.locationId = locationId;
      const items = await Resource.find(filter)
        .populate('resourceType', 'name category color icon')
        .sort({ 'resourceType.name': 1, label: 1 })
        .lean();
      res.json({ items });
    } catch (error) {
      logger.error('List resources error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch resources' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { resourceTypeId, label, species, active, locationId } = req.body || {};

      if (!resourceTypeId || !label || !locationId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'resourceTypeId, label and locationId are required',
          },
        });
      }

      // Verify the resource type exists and belongs to the company
      const resourceType = await ResourceType.findOne({ _id: resourceTypeId, companyId });
      if (!resourceType) {
        return res
          .status(400)
          .json({ error: { code: 'INVALID_RESOURCE_TYPE', message: 'Invalid resource type' } });
      }

      // Validate location belongs to this company
      const { default: Location } = await import('../models/Location.js');
      const loc = await Location.findOne({ _id: locationId, companyId }).select('_id').lean();
      if (!loc) {
        return res
          .status(400)
          .json({
            error: { code: 'INVALID_LOCATION', message: 'Invalid locationId for this company' },
          });
      }

      // Normalize and validate species
      const allowedSpecies = ['dog', 'cat', 'all', 'other'];
      let speciesArray;
      if (species === undefined) {
        speciesArray = ['all'];
      } else if (Array.isArray(species)) {
        speciesArray = species.map(s => String(s)).filter(Boolean);
      } else {
        speciesArray = [String(species)];
      }

      const isValidSpecies = speciesArray.every(s => allowedSpecies.includes(s));
      if (!isValidSpecies) {
        return res.status(400).json({
          error: {
            code: 'INVALID_SPECIES',
            message: `species must be one or more of: ${allowedSpecies.join(', ')}`,
          },
        });
      }

      const resource = await Resource.create({
        companyId,
        locationId,
        resourceTypeId,
        label: String(label).trim(),
        species: speciesArray,
        active: active !== undefined ? Boolean(active) : true,
      });

      // Populate the resource type for the response
      await resource.populate('resourceType', 'name category color icon');

      res.status(201).json({ resource });
    } catch (error) {
      logger.error('Create resource error:', error);
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create resource' } });
    }
  }

  static async update(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const { resourceTypeId, label, species, active } = req.body || {};

      const update = {};
      if (resourceTypeId !== undefined) {
        // Verify the resource type exists and belongs to the company
        const resourceType = await ResourceType.findOne({ _id: resourceTypeId, companyId });
        if (!resourceType) {
          return res
            .status(400)
            .json({ error: { code: 'INVALID_RESOURCE_TYPE', message: 'Invalid resource type' } });
        }
        update.resourceTypeId = resourceTypeId;
      }
      if (label !== undefined) update.label = String(label).trim();
      if (species !== undefined) {
        const allowedSpecies = ['dog', 'cat', 'all', 'other'];
        let speciesArray;
        if (Array.isArray(species)) {
          speciesArray = species.map(s => String(s)).filter(Boolean);
        } else {
          speciesArray = [String(species)];
        }
        const isValidSpecies = speciesArray.every(s => allowedSpecies.includes(s));
        if (!isValidSpecies) {
          return res.status(400).json({
            error: {
              code: 'INVALID_SPECIES',
              message: `species must be one or more of: ${allowedSpecies.join(', ')}`,
            },
          });
        }
        update.species = speciesArray;
      }
      if (active !== undefined) update.active = Boolean(active);

      const resource = await Resource.findOneAndUpdate(
        { _id: id, companyId },
        { $set: update },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate('resourceType', 'name category color icon')
        .lean();

      if (!resource) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }
      res.json({ resource });
    } catch (error) {
      logger.error('Update resource error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update resource' } });
    }
  }

  static async remove(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const resource = await Resource.findOneAndDelete({ _id: id, companyId }).lean();
      if (!resource) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }
      res.json({ message: 'Resource deleted', resource });
    } catch (error) {
      logger.error('Delete resource error:', error);
      res
        .status(500)
        .json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete resource' } });
    }
  }
}
