;
import logger from '../utils/logger.js';
import { AuthService } from '../services/authService.js';
import StaffSchedule from '../models/StaffSchedule.js';
;
;
import { escapeRegex } from '../utils/escapeRegex.js';
import { Company, ServiceCategory, User } from '@petbuddy/shared';

/**
 * Auto-assign service categories based on role using allowedRoles field
 * @param {string} role - Staff role (groomer, receptionist, manager, veterinarian, etc.)
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} - Array of service category IDs
 */
async function getDefaultServiceCategoriesByRole(role, companyId) {
  try {
    // Managers and receptionists can handle all services (empty array = no restrictions)
    if (role === 'manager' || role === 'receptionist') {
      return [];
    }

    // Find all service categories where this role is allowed
    const matchingCategories = await ServiceCategory.find({
      companyId,
      allowedRoles: { $in: [role] },
    }).select('_id').lean();

    return matchingCategories.map(cat => cat._id);
  } catch (error) {
    logger.error('Error getting default service categories by role:', error);
    return []; // Fail gracefully
  }
}

export class StaffController {
  static async list(req, res) {
    try {
      const { companyId } = req.user;
      const { role, q, locationId, serviceProvider, serviceCategoryId } = req.query;
      const filter = { companyId };
      if (role) filter.role = role;
      if (locationId) filter.locationIds = { $in: [locationId] };

      // Filter by serviceProvider field if specified
      if (serviceProvider !== undefined) {
        filter.serviceProvider = serviceProvider === 'true' || serviceProvider === true;
      }

      // Filter by service category if specified
      if (serviceCategoryId) {
        filter.serviceCategoryIds = { $in: [serviceCategoryId] };
      }

      if (q) {
        const escaped = escapeRegex(q);
        filter.$or = [
          { fullName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
        ];
      }
      const staff = await User.find(filter)
        .sort({ fullName: 1 })
        .select('fullName role roles email phone color locationIds primaryLocationId serviceProvider serviceCategoryIds createdAt updatedAt')
        .lean();

      const staffIds = staff.map(s => s._id);
      const schedules = await StaffSchedule.find({ userId: { $in: staffIds } }).lean();

      staff.forEach(s => {
        s.schedules = schedules.filter(sch => sch.userId.toString() === s._id.toString());
      });

      res.json({ items: staff });
    } catch (error) {
      logger.error('List staff error:', error);
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch staff' } });
    }
  }

  static async create(req, res) {
    try {
      const { companyId } = req.user;
      const { fullName, email, role, roles, password, phone, color, locationIds, primaryLocationId, serviceCategoryIds } =
        req.body || {};

      // Support both 'role' (single) and 'roles' (array) for backwards compatibility
      const staffRoles = roles && Array.isArray(roles) && roles.length > 0 ? roles : (role ? [role] : []);
      const primaryRole = staffRoles[0]; // Use first role as primary for backwards compatibility

      if (!fullName || !email || staffRoles.length === 0 || !password) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'fullName, email, roles (or role), and password are required',
          },
        });
      }

      const allowedRoles = ['receptionist', 'groomer', 'manager', 'veterinarian', 'vet_technician', 'trainer'];
      const invalidRoles = staffRoles.filter(r => !allowedRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ROLE',
            message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${allowedRoles.join(', ')}`,
          },
        });
      }

      const passwordHash = await AuthService.hashPassword(password);

      // Automatically set serviceProvider based on roles
      // Only groomers, veterinarians, vet_technicians, and trainers are service providers by default
      const serviceProviderRoles = ['groomer', 'veterinarian', 'vet_technician', 'trainer'];
      const isServiceProvider = staffRoles.some(r => serviceProviderRoles.includes(r));

      // Auto-assign service categories based on all roles if not explicitly provided
      let finalServiceCategoryIds = serviceCategoryIds;
      if (!Array.isArray(finalServiceCategoryIds) || finalServiceCategoryIds.length === 0) {
        // Merge service categories from all roles
        const allCategoryIds = new Set();
        for (const staffRole of staffRoles) {
          const categoriesForRole = await getDefaultServiceCategoriesByRole(staffRole, companyId);
          categoriesForRole.forEach(id => allCategoryIds.add(id.toString()));
        }
        finalServiceCategoryIds = Array.from(allCategoryIds);
      }

      const user = await User.create({
        companyId,
        fullName: String(fullName).trim(),
        email: String(email).trim().toLowerCase(),
        role: primaryRole, // Primary role for backwards compatibility
        roles: staffRoles, // All roles
        passwordHash,
        phone: phone ? String(phone).trim() : '',
        serviceProvider: isServiceProvider,
        ...(color ? { color: String(color).trim() } : {}),
        ...(Array.isArray(locationIds)
          ? { locationIds }
          : primaryLocationId
            ? { locationIds: [primaryLocationId] }
            : {}),
        ...(primaryLocationId ? { primaryLocationId } : {}),
        serviceCategoryIds: finalServiceCategoryIds,
      });

      // Automatically create default schedule for non-manager roles
      try {
        if (user.role !== 'manager') {
          const company = await Company.findById(companyId).select('settings.workHours').lean();

          const workHours = Array.isArray(company?.settings?.workHours)
            ? company.settings.workHours
            : [];

          if (workHours.length > 0) {
            const scheduleDocs = workHours.map(wh => ({
              companyId,
              userId: user._id,
              locationId:
                user.primaryLocationId || (user.locationIds?.[0] ? user.locationIds[0] : undefined),
              weekday: wh.weekday,
              startTime: wh.startTime,
              endTime: wh.endTime,
              breakWindows: [],
            }));

            const filtered = scheduleDocs.filter(d => !!d.locationId);
            if (filtered.length > 0) {
              await StaffSchedule.insertMany(filtered, { ordered: true });
            }
          }
        }
      } catch (scheduleError) {
        logger.warn('Default staff schedule creation failed:', scheduleError);
      }

      return res.status(201).json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          roles: user.roles,
          phone: user.phone,
          color: user.color,
          serviceProvider: user.serviceProvider,
          locationIds: user.locationIds,
          primaryLocationId: user.primaryLocationId,
          serviceCategoryIds: user.serviceCategoryIds,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Create staff error:', error);
      if (error?.code === 11000) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'User with this email already exists in company',
          },
        });
      }
      res
        .status(500)
        .json({ error: { code: 'CREATE_FAILED', message: 'Failed to create staff member' } });
    }
  }

  static async update(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const { fullName, email, role, roles, password, phone, color, locationIds, primaryLocationId, serviceCategoryIds } =
        req.body || {};

      const update = {};
      if (fullName !== undefined) update.fullName = String(fullName).trim();
      if (email !== undefined) update.email = String(email).trim().toLowerCase();

      // Handle roles update - support both 'role' and 'roles' for backwards compatibility
      if (roles !== undefined && Array.isArray(roles)) {
        const allowedRoles = ['receptionist', 'groomer', 'manager', 'veterinarian', 'vet_technician', 'trainer'];
        const invalidRoles = roles.filter(r => !allowedRoles.includes(r));
        if (invalidRoles.length > 0) {
          return res.status(400).json({
            error: {
              code: 'INVALID_ROLE',
              message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${allowedRoles.join(', ')}`,
            },
          });
        }
        update.roles = roles;
        update.role = roles[0]; // Update primary role for backwards compatibility
        // Automatically update serviceProvider based on new roles
        const serviceProviderRoles = ['groomer', 'veterinarian', 'vet_technician', 'trainer'];
        update.serviceProvider = roles.some(r => serviceProviderRoles.includes(r));
      } else if (role !== undefined) {
        // Backwards compatibility: single role update
        const allowedRoles = ['receptionist', 'groomer', 'manager', 'veterinarian', 'vet_technician', 'trainer'];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_ROLE',
              message: `role must be one of: ${allowedRoles.join(', ')}`,
            },
          });
        }
        update.role = role;
        update.roles = [role];
        // Automatically update serviceProvider based on new role
        const serviceProviderRoles = ['groomer', 'veterinarian', 'vet_technician', 'trainer'];
        update.serviceProvider = serviceProviderRoles.includes(role);
      }
      if (phone !== undefined) update.phone = String(phone).trim();
      if (color !== undefined) update.color = String(color).trim();
      if (password) {
        update.passwordHash = await AuthService.hashPassword(password);
      }
      if (locationIds !== undefined) {
        update.locationIds = Array.isArray(locationIds) ? locationIds : [];
      } else if (primaryLocationId !== undefined && primaryLocationId) {
        update.locationIds = [primaryLocationId];
      }
      if (primaryLocationId !== undefined)
        update.primaryLocationId = primaryLocationId ? primaryLocationId : undefined;
      if (serviceCategoryIds !== undefined) {
        update.serviceCategoryIds = Array.isArray(serviceCategoryIds) ? serviceCategoryIds : [];
      }

      const user = await User.findOneAndUpdate(
        { _id: id, companyId },
        { $set: update },
        {
          new: true,
          runValidators: true,
          projection:
            'fullName email role roles phone color serviceProvider locationIds primaryLocationId serviceCategoryIds createdAt updatedAt',
        }
      ).lean();

      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Staff not found' } });
      }

      res.json({ user });
    } catch (error) {
      logger.error('Update staff error:', error);
      res
        .status(500)
        .json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update staff member' } });
    }
  }

  static async remove(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;
      const user = await User.findOneAndDelete(
        { _id: id, companyId },
        { projection: '_id' }
      ).lean();
      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Staff not found' } });
      }
      res.json({ message: 'Staff deleted' });
    } catch (error) {
      logger.error('Delete staff error:', error);
      res
        .status(500)
        .json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete staff member' } });
    }
  }
}
