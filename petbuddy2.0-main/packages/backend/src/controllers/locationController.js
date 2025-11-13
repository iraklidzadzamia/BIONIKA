;
import logger from '../utils/logger.js';
import { Location } from '@petbuddy/shared';

export class LocationController {
  static async getById(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const location = await Location.findOne({ _id: id, companyId }).lean();
      if (!location) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Location not found' } });
      }
      res.json({ location });
    } catch (error) {
      logger.error('Get location error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch location' } });
    }
  }
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const items = await Location.find({ companyId }).sort({ isMain: -1, label: 1 }).lean();
      res.json({ items });
    } catch (error) {
      logger.error('List locations error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch locations' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { label, address, googleLocationUrl, phone, timezone, isMain, workHours, holidays } =
        req.body || {};

      if (!label || !address) {
        return res.status(400).json({
          error: { code: 'MISSING_FIELDS', message: 'label and address are required' },
        });
      }

      const location = await Location.create({
        companyId,
        label: String(label).trim(),
        address: String(address).trim(),
        ...(googleLocationUrl ? { googleLocationUrl: String(googleLocationUrl).trim() } : {}),
        ...(phone ? { phone: String(phone).trim() } : {}),
        ...(timezone ? { timezone: String(timezone).trim() } : {}),
        ...(isMain !== undefined ? { isMain: Boolean(isMain) } : {}),
        ...(Array.isArray(workHours) ? { workHours } : {}),
        ...(Array.isArray(holidays) ? { holidays } : {}),
      });

      res.status(201).json({ location });
    } catch (error) {
      logger.error('Create location error:', error);
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create location' } });
    }
  }

  static async update(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const { label, address, googleLocationUrl, phone, timezone, isMain, workHours, holidays } =
        req.body || {};

      const update = {};
      if (label !== undefined) update.label = String(label).trim();
      if (address !== undefined) update.address = String(address).trim();
      if (googleLocationUrl !== undefined)
        update.googleLocationUrl = String(googleLocationUrl).trim();
      if (phone !== undefined) update.phone = String(phone).trim();
      if (timezone !== undefined) update.timezone = String(timezone).trim();
      if (isMain !== undefined) update.isMain = Boolean(isMain);
      if (workHours !== undefined) update.workHours = Array.isArray(workHours) ? workHours : [];
      if (holidays !== undefined) update.holidays = Array.isArray(holidays) ? holidays : [];

      const location = await Location.findOneAndUpdate(
        { _id: id, companyId },
        { $set: update },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

      if (!location) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Location not found' } });
      }

      res.json({ location });
    } catch (error) {
      logger.error('Update location error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update location' } });
    }
  }

  static async remove(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const deleted = await Location.findOneAndDelete({ _id: id, companyId }).lean();
      if (!deleted) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Location not found' } });
      }
      res.json({ message: 'Location deleted' });
    } catch (error) {
      logger.error('Delete location error:', error);
      res
        .status(500)
        .json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete location' } });
    }
  }
}
