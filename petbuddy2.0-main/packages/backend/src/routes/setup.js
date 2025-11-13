import express from 'express';
import { CompanySetupService } from '../services/companySetupService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

/**
 * @route GET /api/setup/defaults
 * @desc Get default configurations template
 * @access Public (for potential customers to see what they'll get)
 */
router.get('/defaults', (req, res) => {
  try {
    const defaults = {
      companySettings: CompanySetupService.getDefaultCompanySettings(),
      services: CompanySetupService.getDefaultServicesTemplate(),
      resources: CompanySetupService.getDefaultResourcesTemplate(),
      serviceItems: CompanySetupService.getDefaultServiceItemsTemplate(),
      userPicture: CompanySetupService.getDefaultUserPicture(),
      companyLogo: CompanySetupService.getDefaultCompanyLogo(),
    };

    res.json({
      success: true,
      data: defaults,
      message: 'Default configurations retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DEFAULTS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve default configurations',
      },
    });
  }
});

/**
 * @route GET /api/setup/company/:companyId
 * @desc Get current company configuration
 * @access Private (company managers only)
 */
router.get('/company/:companyId', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const { companyId } = req.params;

    // Verify the user belongs to this company
    if (req.user.companyId.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You can only view your own company configuration',
        },
      });
    }

    // Get company's current configuration
    const companyConfig = {
      companySettings: CompanySetupService.getDefaultCompanySettings(),
      currentServices: await CompanySetupService.getCompanyServices(companyId),
      currentServiceItems: await CompanySetupService.getCompanyServiceItems(companyId),
      currentResources: await CompanySetupService.getCompanyResources(companyId),
    };

    res.json({
      success: true,
      data: companyConfig,
      message: 'Company configuration retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_RETRIEVAL_FAILED',
        message: 'Failed to retrieve company configuration',
      },
    });
  }
});

/**
 * @route POST /api/setup/company/:companyId/reset-services
 * @desc Reset company services to defaults
 * @access Private (company managers only)
 */
router.post(
  '/company/:companyId/reset-services',
  authenticateToken,
  requireRole('manager'),
  async (req, res) => {
    try {
      const { companyId } = req.params;

      // Verify the user belongs to this company
      if (req.user.companyId.toString() !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only modify your own company configuration',
          },
        });
      }

      // Reset services to defaults
      await CompanySetupService.resetServicesToDefaults(companyId);

      res.json({
        success: true,
        message: 'Company services reset to defaults successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_RESET_FAILED',
          message: 'Failed to reset company services',
        },
      });
    }
  }
);

/**
 * @route POST /api/setup/company/:companyId/reset-resources
 * @desc Reset company resources to defaults
 * @access Private (company managers only)
 */
router.post(
  '/company/:companyId/reset-resources',
  authenticateToken,
  requireRole('manager'),
  async (req, res) => {
    try {
      const { companyId } = req.params;

      // Verify the user belongs to this company
      if (req.user.companyId.toString() !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only modify your own company configuration',
          },
        });
      }

      // Reset resources to defaults
      await CompanySetupService.resetResourcesToDefaults(companyId);

      res.json({
        success: true,
        message: 'Company resources reset to defaults successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RESOURCE_RESET_FAILED',
          message: 'Failed to reset company resources',
        },
      });
    }
  }
);

/**
 * @route POST /api/setup/company/:companyId/reset-all
 * @desc Reset company services, resources, and variants to defaults
 * @access Private (company managers only)
 */
router.post(
  '/company/:companyId/reset-all',
  authenticateToken,
  requireRole('manager'),
  async (req, res) => {
    try {
      const { companyId } = req.params;

      // Verify the user belongs to this company
      if (req.user.companyId.toString() !== companyId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only modify your own company configuration',
          },
        });
      }

      // Reset everything to defaults
      await CompanySetupService.resetServicesToDefaults(companyId);
      await CompanySetupService.resetResourcesToDefaults(companyId);

      res.json({
        success: true,
        message: 'Company configuration reset to defaults successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_FAILED',
          message: 'Failed to reset company configuration',
        },
      });
    }
  }
);

/**
 * @route GET /api/setup/onboarding
 * @desc Get onboarding guide for new companies
 * @access Public
 */
router.get('/onboarding', (req, res) => {
  const onboardingGuide = {
    title: 'Welcome to PetBuddy! 🐾',
    steps: [
      {
        step: 1,
        title: 'Review Your Setup',
        description:
          'Your account comes with pre-configured services, resources, working hours, and settings',
        action: 'Check your dashboard to see all the defaults',
      },
      {
        step: 2,
        title: 'Customize Services',
        description: 'Adjust pricing, durations, and service descriptions to match your business',
        action: 'Go to Services page to make changes',
      },
      {
        step: 3,
        title: 'Manage Resources',
        description: 'Configure your grooming tubs, tables, dryers, and waiting areas',
        action: 'Visit Resources page to adjust equipment',
      },
      {
        step: 4,
        title: 'Set Working Hours',
        description: 'Modify your business hours and holidays',
        action: 'Visit Settings > Company to adjust schedule',
      },
      {
        step: 5,
        title: 'Add Your Team',
        description: 'Invite staff members and set their roles',
        action: 'Go to Staff page to add team members',
      },
      {
        step: 6,
        title: 'Upload Branding',
        description: 'Add your company logo and customize appearance',
        action: 'Visit Settings > Company to upload images',
      },
      {
        step: 7,
        title: 'Configure AI Agent',
        description: 'Customize your AI assistant responses',
        action: 'Go to Settings > AI Agent to personalize',
      },
      {
        step: 8,
        title: 'Start Booking',
        description: "You're ready to accept appointments!",
        action: 'Test the booking system with a sample appointment',
      },
    ],
    tips: [
      'All defaults can be customized anytime',
      "Your changes don't affect other companies",
      'Use the demo data to understand the system',
      'Contact support if you need help',
    ],
  };

  res.json({
    success: true,
    data: onboardingGuide,
    message: 'Onboarding guide retrieved successfully',
  });
});

export default router;
