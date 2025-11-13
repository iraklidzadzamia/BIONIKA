;
import StaffSchedule from '../models/StaffSchedule.js';
import logger from '../utils/logger.js';
import { User } from '@petbuddy/shared';

const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm

export class StaffScheduleController {
  static async getByUser(req, res) {
    try {
      const { companyId } = req.user;
      const { id: userId } = req.params;
      const { locationId } = req.query || {};

      const user = await User.findOne({ _id: userId, companyId }).select('_id');
      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Staff not found' } });
      }

      const schedules = await StaffSchedule.find({
        companyId,
        userId,
        ...(locationId ? { locationId } : {}),
      })
        .sort({ weekday: 1 })
        .lean();

      // Shape response
      const items = schedules.map(s => ({
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        breakWindows: (s.breakWindows || []).map(b => ({ start: b.start, end: b.end })),
      }));

      res.json({ items });
    } catch (error) {
      logger.error('Get staff schedule error:', error);
      res
        .status(500)
        .json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch schedule' } });
    }
  }

  static async saveForUser(req, res) {
    try {
      const { companyId } = req.user;
      const { id: userId } = req.params;
      const { schedule, locationId } = req.body || {};

      if (!locationId) {
        return res
          .status(400)
          .json({ error: { code: 'MISSING_LOCATION', message: 'locationId is required' } });
      }

      // Validate location ownership
      const { default: Location } = await import('../models/Location.js');
      const loc = await Location.findOne({ _id: locationId, companyId }).select('_id').lean();
      if (!loc) {
        return res
          .status(400)
          .json({
            error: { code: 'INVALID_LOCATION', message: 'Invalid locationId for this company' },
          });
      }

      const user = await User.findOne({ _id: userId, companyId }).select('_id');
      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Staff not found' } });
      }

      if (!Array.isArray(schedule)) {
        return res
          .status(400)
          .json({ error: { code: 'INVALID_BODY', message: 'schedule must be an array' } });
      }

      // Validate schedule entries
      const seenDays = new Set();
      for (const entry of schedule) {
        const { weekday, startTime, endTime, breakWindows } = entry || {};

        if (typeof weekday !== 'number' || weekday < 0 || weekday > 6) {
          return res
            .status(400)
            .json({ error: { code: 'INVALID_WEEKDAY', message: 'weekday must be 0-6' } });
        }
        if (seenDays.has(weekday)) {
          return res.status(400).json({
            error: {
              code: 'DUPLICATE_WEEKDAY',
              message: 'Only one entry per weekday is allowed',
            },
          });
        }
        seenDays.add(weekday);

        if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
          return res.status(400).json({
            error: { code: 'INVALID_TIME', message: 'Invalid time format; expected HH:mm' },
          });
        }
        if (endTime <= startTime) {
          return res
            .status(400)
            .json({ error: { code: 'INVALID_RANGE', message: 'endTime must be after startTime' } });
        }

        if (breakWindows && !Array.isArray(breakWindows)) {
          return res
            .status(400)
            .json({ error: { code: 'INVALID_BREAKS', message: 'breakWindows must be an array' } });
        }
        if (Array.isArray(breakWindows)) {
          for (const b of breakWindows) {
            if (!TIME_REGEX.test(b.start) || !TIME_REGEX.test(b.end)) {
              return res.status(400).json({
                error: { code: 'INVALID_BREAK_TIME', message: 'Break windows must use HH:mm' },
              });
            }
            if (b.end <= b.start) {
              return res.status(400).json({
                error: { code: 'INVALID_BREAK_RANGE', message: 'Break end must be after start' },
              });
            }
            if (b.start < startTime || b.end > endTime) {
              return res.status(400).json({
                error: {
                  code: 'BREAK_OUT_OF_RANGE',
                  message: 'Break window must be within working hours',
                },
              });
            }
          }
        }
      }

      // Replace schedules for this user atomically (best-effort)
      await StaffSchedule.deleteMany({ companyId, userId, locationId });

      if (schedule.length > 0) {
        const docs = schedule.map(s => ({
          companyId,
          userId,
          locationId,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
          breakWindows: (s.breakWindows || []).map(b => ({ start: b.start, end: b.end })),
        }));
        await StaffSchedule.insertMany(docs, { ordered: true });
      }

      res.json({ ok: true });
    } catch (error) {
      logger.error('Save staff schedule error:', error);
      // Handle duplicate key just in case
      if (error?.code === 11000) {
        return res
          .status(409)
          .json({ error: { code: 'DUPLICATE_SCHEDULE', message: 'Duplicate weekday entry' } });
      }
      res.status(500).json({ error: { code: 'SAVE_FAILED', message: 'Failed to save schedule' } });
    }
  }
}
