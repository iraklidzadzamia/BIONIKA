;
;
import logger from '../utils/logger.js';
import { parsePagination, createPaginationResponse } from '../utils/pagination.js';
;
import { isCompanyEmailAvailable, isValidEmailFormat } from '../utils/emailValidation.js';
import { Company, ServiceCategory, ServiceItem, STAFF_ROLE_VALUES } from '@petbuddy/shared';

/**
 * Get company profile by ID
 */
export const getCompanyProfile = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Check if user has companyId
    if (!req.user.companyId) {
      logger.error(`User ${req.user.id} has no companyId`);
      return res.status(403).json({
        message: 'User not associated with any company',
      });
    }

    // Verify user belongs to the requested company
    if (req.user.companyId.toString() !== companyId) {
      logger.warn(
        `User ${req.user.id} (company: ${req.user.companyId}) trying to access company ${companyId}`
      );
      return res.status(403).json({
        message: 'You can only access your own company profile',
        userCompanyId: req.user.companyId,
        requestedCompanyId: companyId,
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get company services with pagination
    const pagination = parsePagination(req.query);
    const total = await ServiceCategory.countDocuments({ companyId });
    const services = await ServiceCategory.find({ companyId })
      .sort(pagination.sort)
      .skip(pagination.skip)
      .limit(pagination.size);

    // Note: embedded company.locations is deprecated; use /locations endpoints instead.

    const response = createPaginationResponse(services, total, pagination.page, pagination.size);

    res.json({
      company,
      services: response.items,
      pagination: response.pagination,
    });
  } catch (error) {
    logger.error('Error getting company profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update company profile
 */
export const updateCompanyProfile = async (req, res) => {
  try {
    const { companyId } = req.params;
    const updateData = req.body;

    // Validate required fields
    if (!updateData.name || !updateData.email || !updateData.phone) {
      return res.status(400).json({
        message: 'Name, email, and phone are required',
      });
    }

    // Validate email format
    if (!isValidEmailFormat(updateData.email)) {
      return res.status(400).json({
        message: 'Invalid email format',
      });
    }

    // Check if email is available (excluding current company)
    const isEmailAvailable = await isCompanyEmailAvailable(updateData.email, companyId);
    if (!isEmailAvailable) {
      return res.status(409).json({
        message: 'Company email is already taken by another company',
      });
    }

    // Ignore updates to deprecated embedded locations; managed via /locations
    if (updateData.locations) delete updateData.locations;

    const company = await Company.findByIdAndUpdate(companyId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    logger.info(`Company profile updated: ${company.name}`);
    res.json({ company, message: 'Company profile updated successfully' });
  } catch (error) {
    logger.error('Error updating company profile:', error);

    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Company email is already taken',
      });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get company services with pagination
 */
export const getCompanyServices = async (req, res) => {
  try {
    const { companyId } = req.params;
    const pagination = parsePagination(req.query);

    // Get total count
    const total = await ServiceCategory.countDocuments({ companyId });

    // Get paginated services
    const services = await ServiceCategory.find({ companyId })
      .sort(pagination.sort)
      .skip(pagination.skip)
      .limit(pagination.size);

    const response = createPaginationResponse(services, total, pagination.page, pagination.size);

    res.json(response);
  } catch (error) {
    logger.error('Error getting company services:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create service
 */
export const createService = async (req, res) => {
  try {
    const { companyId } = req.params;
    const serviceData = req.body;

    if (!serviceData.name || !serviceData.species) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'name and species are required',
        },
      });
    }

    const allowedSpecies = ['dog', 'cat', 'dog&cat', 'other'];
    if (!allowedSpecies.includes(serviceData.species)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SPECIES',
          message: `species must be one of: ${allowedSpecies.join(', ')}`,
        },
      });
    }

    const payload = {
      companyId,
      name: String(serviceData.name).trim(),
      description: serviceData.description ? String(serviceData.description).trim() : undefined,
      species: serviceData.species,
      requiresBath: Boolean(serviceData.requiresBath),
    };

    const service = await ServiceCategory.create(payload);
    logger.info(`Service category created: ${service.name} for company: ${companyId}`);
    res.status(201).json({ service, message: 'Service category created successfully' });
  } catch (error) {
    logger.error('Error creating service category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update service
 */
export const updateService = async (req, res) => {
  try {
    const { companyId, serviceId } = req.params;
    const { name, description, species, requiresBath, active, color, allowedRoles } = req.body;

    // Build update object with only allowed fields
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

    const service = await ServiceCategory.findOneAndUpdate(
      { _id: serviceId, companyId },
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    logger.info(`Service updated: ${service.name}`);
    res.json({ service, message: 'Service updated successfully' });
  } catch (error) {
    logger.error('Error updating service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete service
 */
export const deleteService = async (req, res) => {
  try {
    const { companyId, serviceId } = req.params;

    const service = await ServiceCategory.findOneAndDelete({ _id: serviceId, companyId });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Cascade delete related service items
    await ServiceItem.deleteMany({ companyId, serviceCategoryId: service._id });

    logger.info(`Service deleted: ${service.name}`);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update company working hours
 */
export const updateWorkingHours = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { workHours } = req.body;

    if (!workHours || !Array.isArray(workHours)) {
      return res.status(400).json({ message: 'Working hours array is required' });
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { 'settings.workHours': workHours },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    logger.info(`Working hours updated for company: ${company.name}`);
    res.json({
      workHours: company.settings.workHours,
      message: 'Working hours updated successfully',
    });
  } catch (error) {
    logger.error('Error updating working hours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get company working hours
 */
export const getWorkingHours = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ workHours: company.settings.workHours || [] });
  } catch (error) {
    logger.error('Error getting working hours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get company services with populated service items
 */
export const getCompanyServicesWithItems = async (req, res) => {
  try {
    const { companyId } = req.params;
    const pagination = parsePagination(req.query);

    // Get total count
    const total = await ServiceCategory.countDocuments({ companyId });

    // Get paginated services with populated service items
    const services = await ServiceCategory.find({ companyId })
      .sort(pagination.sort)
      .skip(pagination.skip)
      .limit(pagination.size)
      .populate({
        path: 'serviceItems',
        model: 'ServiceItem',
        select:
          'size label coatType durationMinutes price active requiredResources',
      });

    const response = createPaginationResponse(services, total, pagination.page, pagination.size);

    res.json(response);
  } catch (error) {
    logger.error('Error getting company services with items:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all service items with populated service categories
 */
export const getAllServiceItemsWithCategories = async (req, res) => {
  try {
    const { companyId } = req.params;
    const pagination = parsePagination(req.query);

    // Get total count
    const total = await ServiceItem.countDocuments({ companyId });

    // Get paginated service items with populated service categories
    const serviceItems = await ServiceItem.find({ companyId })
      .sort({ 'serviceCategoryId.name': 1, size: 1, coatType: 1 })
      .skip(pagination.skip)
      .limit(pagination.size)
      .populate('serviceCategoryId', 'name description species requiresBath active');

    const response = createPaginationResponse(
      serviceItems,
      total,
      pagination.page,
      pagination.size
    );

    res.json(response);
  } catch (error) {
    logger.error('Error getting service items with categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
