;
import logger from '../utils/logger.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { Contact } from '@petbuddy/shared';

export class CustomerController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { q } = req.query;
      const filter = { companyId, contactStatus: 'customer' };
      if (q) {
        const escaped = escapeRegex(q);
        filter.$or = [
          { fullName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
          { phone: { $regex: escaped, $options: 'i' } },
        ];
      }
      const customers = await Contact.find(filter)
        .sort({ fullName: 1 })
        .select('fullName email phone social')
        .lean();
      res.json({ items: customers });
    } catch (error) {
      logger.error('List customers error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch customers' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { fullName, email, phone, notes, social } = req.body || {};
      if (!fullName || !phone) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'fullName and phone are required',
          },
        });
      }
      const customer = await Contact.create({
        companyId,
        fullName,
        email,
        phone,
        social,
        notes,
        contactStatus: 'customer',
      });
      res.status(201).json({ customer });
    } catch (error) {
      logger.error('Create customer error:', error);
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create customer' } });
    }
  }

  static async findByPhone(req, res) {
    try {
      const { companyId } = req.user;
      const { phone } = req.query;
      if (!phone || phone.length < 3) {
        return res.status(400).json({
          error: { code: 'MISSING_PHONE', message: 'phone query is required (min 3 chars)' },
        });
      }
      const escaped = escapeRegex(phone);
      const customers = await Contact.find({
        companyId,
        contactStatus: 'customer',
        phone: { $regex: escaped, $options: 'i' },
      })
        .sort({ fullName: 1 })
        .select('fullName email phone social')
        .lean();
      res.json({ items: customers });
    } catch (error) {
      logger.error('Find by phone error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to search customers' } });
    }
  }
}
