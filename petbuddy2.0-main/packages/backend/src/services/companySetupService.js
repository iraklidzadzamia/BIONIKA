import Resource from '../models/Resource.js';
import ResourceType from '../models/ResourceType.js';
import AIPrompt from '../models/AIPrompt.js';
import logger from '../utils/logger.js';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_SERVICES,
  DEFAULT_RESOURCES,
  DEFAULT_RESOURCE_TYPES,
  DEFAULT_SERVICE_ITEMS,
  DEFAULT_USER_PICTURE,
  DEFAULT_COMPANY_LOGO,
} from '../config/defaults.js';
import { getAIPromptForBusinessType } from '../config/aiPromptsByBusinessType.js';
import { getCombinedSeeds } from './businessTypeSeeds.js';
import { Company, Location, ServiceCategory, ServiceItem } from '@petbuddy/shared';

export class CompanySetupService {
  /**
   * Set up default configurations for a new company
   */
  static async setupDefaults(companyId, session = null) {
    try {
      logger.info(`Setting up default configurations for company: ${companyId}`);

      // Get company to check business types
      const company = await Company.findById(companyId).session(session);
      if (!company) {
        throw new Error(`Company not found with ID: ${companyId}`);
      }
      const businessTypes = company?.businessTypes || [];

      // Get business-type-specific seeds
      const seeds = getCombinedSeeds(businessTypes);

      // Create default resource types based on business type
      try {
        await this.createDefaultResourceTypes(companyId, session, seeds);
      } catch (error) {
        throw new Error(`Failed to create default resource types: ${error.message}`);
      }

      // Create default resources based on business type
      try {
        await this.createDefaultResources(companyId, session, seeds);
      } catch (error) {
        throw new Error(`Failed to create default resources: ${error.message}`);
      }

      // Create default services based on business type
      let createdServices;
      try {
        createdServices = await this.createDefaultServices(companyId, session, seeds);
      } catch (error) {
        throw new Error(`Failed to create default services: ${error.message}`);
      }

      // Create default service variants based on business type
      try {
        await this.createDefaultServiceItems(companyId, createdServices, session, seeds);
      } catch (error) {
        throw new Error(`Failed to create default service items: ${error.message}`);
      }

      // Assign default AI prompt (optional - log warning if fails but don't abort)
      try {
        await this.assignDefaultAIPrompt(companyId, session);
      } catch (error) {
        logger.warn(`Failed to assign default AI prompt for company ${companyId}: ${error.message}`);
        // Don't throw - AI prompt is optional functionality
      }

      logger.info(`Default setup completed for company: ${companyId}`);

      return { success: true };
    } catch (error) {
      logger.error(`Error setting up defaults for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Assign a default AI prompt to the company based on business type
   */
  static async assignDefaultAIPrompt(companyId, session = null) {
    try {
      logger.info(`Assigning default AI prompt for company: ${companyId}`);

      // Get company to check business types
      const company = await Company.findById(companyId).session(session);
      if (!company) {
        throw new Error(`Company not found with ID: ${companyId}`);
      }

      const businessTypes = company?.businessTypes || [];
      logger.info(`Company business types: ${businessTypes.join(', ')}`);

      // Get business-type-specific AI prompt
      const promptConfig = getAIPromptForBusinessType(businessTypes);

      // Update company with business-type-specific AI prompt
      // Note: activeHours is preserved from company creation (set via mergeWithDefaults)
      await Company.findByIdAndUpdate(
        companyId,
        {
          'bot.systemInstruction': promptConfig.systemInstruction,
          'bot.conversationExamples': promptConfig.conversationExamples,
          'bot.active': true,
        },
        { session }
      );

      logger.info(`Business-type-specific AI prompt assigned for company: ${companyId}`);
      return promptConfig;
    } catch (error) {
      logger.error(`Error assigning default AI prompt for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Create default resource types for the company
   */
  static async createDefaultResourceTypes(companyId, session = null, seeds = null) {
    try {
      logger.info(`Creating default resource types for company: ${companyId}`);

      const sourceResourceTypes = seeds?.resourceTypes || DEFAULT_RESOURCE_TYPES;
      const resourceTypesWithCompanyId = sourceResourceTypes.map(resourceType => ({
        ...resourceType,
        companyId,
      }));

      const createdResourceTypes = await ResourceType.insertMany(resourceTypesWithCompanyId, {
        session,
      });

      logger.info(
        `Created ${createdResourceTypes.length} default resource types for company: ${companyId}`
      );

      return createdResourceTypes;
    } catch (error) {
      logger.error(`Error creating default resource types for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Create default resources for the company
   */
  static async createDefaultResources(companyId, session = null, seeds = null) {
    try {
      logger.info(`Creating default resources for company: ${companyId}`);

      // Get the resource types we just created
      const resourceTypes = await ResourceType.find({ companyId }, null, { session });

      // Ensure there is at least one Location; create a default if none
      let defaultLocation = await Location.findOne({ companyId }, null, { session }).lean();
      if (!defaultLocation) {
        defaultLocation = await Location.create(
          { companyId, label: 'Main', address: 'Main', isMain: true },
          { session }
        );
      }

      const sourceResources = seeds?.resources || DEFAULT_RESOURCES;

      const resourcesWithIds = sourceResources.map(resource => {
        // For seed data, use typeIndex, for legacy data use resourceTypeName
        let resourceTypeId;
        if (resource.typeIndex !== undefined && resourceTypes[resource.typeIndex]) {
          resourceTypeId = resourceTypes[resource.typeIndex]._id;
        } else if (resource.resourceTypeName) {
          const resourceType = resourceTypes.find(rt => rt.name === resource.resourceTypeName);
          resourceTypeId = resourceType?._id;
        }

        if (!resourceTypeId) {
          throw new Error(
            `Resource type not found for resource: ${resource.name || resource.label}`
          );
        }

        return {
          companyId,
          locationId: defaultLocation._id,
          resourceTypeId,
          label: resource.name || resource.label,
          species:
            Array.isArray(resource.species) && resource.species.length > 0
              ? resource.species
              : ['all'],
          active: resource.active !== undefined ? resource.active : true,
        };
      });

      const createdResources = await Resource.insertMany(resourcesWithIds, { session });

      logger.info(`Created ${createdResources.length} default resources for company: ${companyId}`);

      return createdResources;
    } catch (error) {
      logger.error(`Error creating default resources for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Create default services for the company
   */
  static async createDefaultServices(companyId, session = null, seeds = null) {
    try {
      logger.info(`Creating default services for company: ${companyId}`);

      const sourceServices = seeds?.serviceCategories || DEFAULT_SERVICES;
      const servicesWithCompanyId = sourceServices.map(service => ({
        name: service.name,
        description: service.description,
        species: service.petType || service.species || 'dog',
        companyId,
        allowedRoles: service.allowedRoles || ['groomer'], // Default roles if not specified
      }));

      const createdServices = await ServiceCategory.insertMany(servicesWithCompanyId, { session });

      logger.info(`Created ${createdServices.length} default services for company: ${companyId}`);

      return createdServices;
    } catch (error) {
      logger.error(`Error creating default services for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Create default service variants for the company
   */
  static async createDefaultServiceItems(companyId, services, session = null, seeds = null) {
    try {
      logger.info(`Creating default service items for company: ${companyId}`);

      const variantsToCreate = [];

      // Build a map of resource type names to ids for quick lookup
      const resourceTypes = await ResourceType.find({ companyId }, null, { session });
      const rtNameToId = new Map(resourceTypes.map(rt => [rt.name, rt._id]));

      // If using seed data, use the variants from seeds
      if (seeds && seeds.serviceCategories) {
        for (let i = 0; i < services.length; i++) {
          const service = services[i];
          const seedCategory = seeds.serviceCategories[i];

          if (seedCategory && seedCategory.variants) {
            for (const variant of seedCategory.variants) {
              variantsToCreate.push({
                companyId,
                serviceCategoryId: service._id,
                size: variant.size,
                label: `${service.name} - ${variant.size}`,
                price: variant.basePrice,
                durationMinutes: variant.duration,
                requiredResources: [],
              });
            }
          }
        }
      } else {
        // Legacy default behavior
        for (const service of services) {
          const defaultVariants = this.getDefaultServiceItemsTemplate(service.species);
          for (const variant of defaultVariants) {
            // Resolve requiredResources by name to ids and attach durations
            const resolvedRequired = (variant.requiredResources || [])
              .map(rr => {
                const resourceTypeId = rtNameToId.get(rr.resourceTypeName);
                if (!resourceTypeId) return null;
                return {
                  resourceTypeId,
                  quantity: 1,
                  durationMinutes: rr.durationMinutes,
                };
              })
              .filter(Boolean);

            // Determine total duration for the variant
            const totalDuration =
              Number(variant.durationMinutes) ||
              resolvedRequired.reduce((sum, r) => sum + (Number(r?.durationMinutes) || 0), 0);

            variantsToCreate.push({
              companyId,
              serviceCategoryId: service._id,
              size: variant.size,
              label: variant.label,
              coatType: variant.coatType,
              durationMinutes: totalDuration,
              price: variant.price,
              requiredResources: resolvedRequired,
            });
          }
        }
      }

      logger.info(`Creating ${variantsToCreate.length} service items...`);
      const createdVariants = await ServiceItem.insertMany(variantsToCreate, { session });

      logger.info(`Successfully created ${createdVariants.length} service items`);
      return createdVariants;
    } catch (error) {
      logger.error('Error creating default service items:', error);
      throw error;
    }
  }

  /**
   * Get default service items template
   */
  static getDefaultServiceItemsTemplate(species = 'dog') {
    // Map simplified defaults by species
    if (species === 'cat') {
      return DEFAULT_SERVICE_ITEMS.filter(v => v.size === 'all');
    }
    if (species === 'dog') {
      return DEFAULT_SERVICE_ITEMS.filter(v => ['S', 'M', 'L', 'XL'].includes(v.size));
    }
    // For other species, no variants by default
    return [];
  }

  /**
   * Get default company settings
   */
  static getDefaultCompanySettings() {
    return { ...DEFAULT_COMPANY_SETTINGS };
  }

  /**
   * Get default user picture
   */
  static getDefaultUserPicture() {
    return DEFAULT_USER_PICTURE;
  }

  /**
   * Get default company logo
   */
  static getDefaultCompanyLogo() {
    return DEFAULT_COMPANY_LOGO;
  }

  /**
   * Get default services template (without companyId)
   */
  static getDefaultServicesTemplate() {
    return DEFAULT_SERVICES;
  }

  /**
   * Get default resources template (without companyId)
   */
  static getDefaultResourcesTemplate() {
    return DEFAULT_RESOURCES;
  }

  /**
   * Get company's current services
   */
  static async getCompanyServices(companyId) {
    try {
      const services = await ServiceCategory.find({ companyId }).sort({ name: 1 });
      return services;
    } catch (error) {
      logger.error(`Error getting services for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Get company's current resources
   */
  static async getCompanyResources(companyId) {
    try {
      const resources = await Resource.find({ companyId })
        .populate('resourceType', 'name category color icon')
        .sort({ 'resourceType.name': 1, label: 1 })
        .lean();
      return resources;
    } catch (error) {
      logger.error(`Error getting resources for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Get company's current service variants
   */
  static async getCompanyServiceItems(companyId) {
    try {
      const variants = await ServiceItem.find({ companyId })
        .populate('serviceCategoryId', 'name species')
        .sort({ 'serviceCategoryId.name': 1, size: 1, coatType: 1 })
        .lean();

      return variants;
    } catch (error) {
      logger.error('Error getting company service items:', error);
      throw error;
    }
  }

  /**
   * Reset company services to defaults
   */
  static async resetServicesToDefaults(companyId, session = null) {
    try {
      // Remove existing services and variants
      await ServiceCategory.deleteMany({ companyId }, { session });
      await ServiceItem.deleteMany({ companyId }, { session });

      // Create new default services
      const newServices = await this.createDefaultServices(companyId, session);

      // Create new default variants
      await this.createDefaultServiceItems(companyId, newServices, session);

      logger.info(`Reset services to defaults for company: ${companyId}`);
      return newServices;
    } catch (error) {
      logger.error(`Error resetting services for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Reset company resources to defaults
   */
  static async resetResourcesToDefaults(companyId, session = null) {
    try {
      // Remove existing resources and resource types
      await Resource.deleteMany({ companyId }, { session });
      await ResourceType.deleteMany({ companyId }, { session });

      // Create new default resource types
      await this.createDefaultResourceTypes(companyId, session);

      // Create new default resources
      const newResources = await this.createDefaultResources(companyId, session);

      logger.info(`Reset resources to defaults for company: ${companyId}`);
      return newResources;
    } catch (error) {
      logger.error(`Error resetting resources for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Validate and merge company data with defaults
   */
  static mergeWithDefaults(companyData) {
    const defaults = this.getDefaultCompanySettings();

    return {
      ...defaults,
      ...companyData,
      // Ensure workHours and holidays are properly merged
      settings: {
        ...defaults.settings,
        ...(companyData.settings || {}),
        workHours: companyData.settings?.workHours || defaults.settings.workHours,
        holidays: companyData.settings?.holidays || defaults.settings.holidays,
      },
      // Ensure bot config is properly merged
      bot: {
        ...defaults.bot,
        ...(companyData.bot || {}),
        // Ensure bot settings are properly nested
        activeHours: {
          ...defaults.bot.activeHours,
          ...(companyData.bot?.activeHours || {}),
        },
      },
      // Ensure integration config is properly merged
      integration: {
        ...defaults.integration,
        ...(companyData.integration || {}),
      },
      // Ensure payment methods are properly merged
      paymentMethods: companyData.paymentMethods || defaults.paymentMethods,
      // Ensure status is set
      status: companyData.status || defaults.status,
      // Ensure mainCurrency is set
      mainCurrency: companyData.mainCurrency || defaults.mainCurrency,
    };
  }

  static async updateCompanyServices(companyId, newServices, session = null) {
    try {
      // Delete existing service items
      await ServiceItem.deleteMany({ companyId }, { session });

      // Create new service items
      await this.createDefaultServiceItems(companyId, newServices, session);

      logger.info(`Updated service items for company: ${companyId}`);
    } catch (error) {
      logger.error('Error updating company service items:', error);
      throw error;
    }
  }
}
