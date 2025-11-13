;
import logger from '../utils/logger.js';
import { Pet } from '@petbuddy/shared';

export class PetController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { customerId } = req.query;
      const filter = { companyId };
      if (customerId) filter.customerId = customerId;
      const pets = await Pet.find(filter)
        .sort({ name: 1 })
        .select('name species breed customerId')
        .lean();
      res.json({ items: pets });
    } catch (error) {
      logger.error('List pets error:', error);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch pets' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { customerId, name, species, breed, sex } = req.body || {};
      if (!customerId || !name || !species || !sex) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'customerId, name, species and sex are required',
          },
        });
      }
      const pet = await Pet.create({ companyId, customerId, name, species, breed, sex });
      res.status(201).json({ pet });
    } catch (error) {
      logger.error('Create pet error:', error);
      res.status(500).json({ error: { code: 'CREATE_FAILED', message: 'Failed to create pet' } });
    }
  }
}
