/**
 * Authorization Module
 * 
 * Provides authorization checks for tool handlers to prevent unauthorized access.
 * Ensures that social media chats can only access data from their authorized company.
 * 
 * CRITICAL SECURITY: All tool handlers MUST call verifyAuthorization before
 * accessing any company data.
 * 
 * USAGE:
 * ```javascript
 * import { verifyAuthorization, verifyResourceOwnership } from './authorization.js';
 * 
 * // At start of tool handler
 * await verifyAuthorization(context, 'view', 'staff_list');
 * 
 * // When accessing resources
 * await verifyResourceOwnership(appointment, context.company_id, 'appointment');
 * ```
 */

import { Company } from '@petbuddy/shared';
import CompanyIntegration from '../models/CompanyIntegration.js';
import logger from '../utils/logger.js';

/**
 * Authorization error - thrown when access is denied
 */
export class AuthorizationError extends Error {
  constructor(action, resource, reason, details = {}) {
    super(`Unauthorized: Cannot ${action} ${resource} - ${reason}`);
    this.name = 'AuthorizationError';
    this.action = action;
    this.resource = resource;
    this.reason = reason;
    this.details = details;
    this.timestamp = new Date();
    
    // Security: Log all authorization failures
    logger.messageFlow.error(
      details.platform || 'unknown',
      details.chatId || 'unknown',
      'authorization-denied',
      this,
      {
        action,
        resource,
        reason,
        companyId: details.companyId,
      }
    );
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      resource: this.resource,
      reason: this.reason,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Verify that the chat user has permission to perform action on resource
 *
 * For social media bots, this validates:
 * 1. Context has required fields (company_id, platform)
 * 2. Company exists in database
 * 3. Company has the appropriate integration configured for the platform
 *
 * This prevents cross-company data access through social media channels.
 * The company is already validated during webhook lookup (by page ID), so we
 * only need to verify the company exists and has the integration.
 *
 * @param {Object} context - Execution context
 * @param {string} context.chat_id - Social media user/sender identifier (for logging only)
 * @param {string} context.company_id - Company identifier
 * @param {string} context.platform - Platform ('facebook' or 'instagram')
 * @param {string} action - Action being performed (e.g., 'view', 'create', 'update', 'delete')
 * @param {string} resource - Resource being accessed (e.g., 'appointment', 'staff_list')
 * @returns {Promise<{company: Object, authorized: boolean}>}
 * @throws {AuthorizationError} If authorization fails
 */
export async function verifyAuthorization(context, action, resource) {
  const { chat_id, company_id, platform } = context;

  // Validate required context fields
  if (!company_id) {
    throw new AuthorizationError(
      action,
      resource,
      'Missing company_id in context',
      { ...context, chatId: chat_id }
    );
  }

  if (!platform) {
    throw new AuthorizationError(
      action,
      resource,
      'Missing platform in context',
      { ...context, chatId: chat_id }
    );
  }

  // Validate platform
  if (!['facebook', 'instagram'].includes(platform)) {
    throw new AuthorizationError(
      action,
      resource,
      `Invalid platform: ${platform}. Must be 'facebook' or 'instagram'`,
      { ...context, chatId: chat_id }
    );
  }

  try {
    // Get company and verify it exists
    const company = await Company.findById(company_id).lean();

    if (!company) {
      throw new AuthorizationError(
        action,
        resource,
        `Company ${company_id} not found`,
        { ...context, chatId: chat_id }
      );
    }

    // Get the CompanyIntegration to verify Meta integration exists
    // Note: Company and CompanyIntegration are separate collections.
    // The company_id comes from webhook lookup, which already verified
    // the integration exists, but we double-check for security.
    const integration = await CompanyIntegration.findOne({
      companyId: company_id
    }).lean();

    if (!integration) {
      logger.messageFlow.error(
        platform,
        chat_id,
        'authorization-no-integration',
        `SECURITY: Company ${company_id} has no integration record`,
        {
          action,
          resource,
          companyId: company_id,
          platform,
        }
      );

      throw new AuthorizationError(
        action,
        resource,
        `Company has no integration configured`,
        {
          companyId: company_id,
          platform,
        }
      );
    }

    // Verify the integration has the appropriate platform configured
    let hasIntegration = false;

    if (platform === 'facebook') {
      hasIntegration = !!integration.facebookChatId;
    } else if (platform === 'instagram') {
      hasIntegration = !!integration.instagramChatId;
    }

    if (!hasIntegration) {
      // This shouldn't happen if webhook lookup worked, but log it for security
      logger.messageFlow.error(
        platform,
        chat_id,
        'authorization-no-integration',
        `SECURITY: Company ${company_id} has no ${platform} integration configured`,
        {
          action,
          resource,
          companyId: company_id,
          platform,
          hasFacebookId: !!integration.facebookChatId,
          hasInstagramId: !!integration.instagramChatId,
        }
      );

      throw new AuthorizationError(
        action,
        resource,
        `Company has no ${platform} integration configured`,
        {
          companyId: company_id,
          platform,
        }
      );
    }

    // Log successful authorization (at debug level)
    if (process.env.DEBUG_AUTH === 'true') {
      logger.messageFlow.info(
        platform,
        chat_id,
        'authorization-granted',
        `Authorized: ${action} ${resource} for company ${company_id}`,
        { action, resource }
      );
    }

    return { company, authorized: true };
    
  } catch (error) {
    // Re-throw AuthorizationError as-is
    if (error instanceof AuthorizationError) {
      throw error;
    }
    
    // Wrap other errors
    logger.messageFlow.error(
      platform || 'unknown',
      chat_id || 'unknown',
      'authorization-error',
      error
    );
    
    throw new AuthorizationError(
      action,
      resource,
      `Authorization check failed: ${error.message}`,
      { ...context, originalError: error.message }
    );
  }
}

/**
 * Verify that a resource belongs to the specified company
 * 
 * Prevents cross-company resource access by validating resource ownership.
 * Always call this when accessing resources that could belong to different companies.
 * 
 * @param {Object} resource - Resource object to check
 * @param {string} companyId - Expected company ID
 * @param {string} resourceType - Type of resource (for error messages)
 * @returns {boolean} True if ownership verified
 * @throws {AuthorizationError} If resource doesn't belong to company
 */
export async function verifyResourceOwnership(resource, companyId, resourceType) {
  if (!resource) {
    throw new AuthorizationError(
      'access',
      resourceType,
      'Resource not found',
      { companyId, resourceType }
    );
  }
  
  if (!companyId) {
    throw new AuthorizationError(
      'access',
      resourceType,
      'Missing companyId for ownership verification',
      { resourceType }
    );
  }
  
  // Extract company ID from resource
  const resourceCompanyId = String(resource.companyId || resource.company_id || resource.company);
  const contextCompanyId = String(companyId);
  
  if (!resourceCompanyId) {
    throw new AuthorizationError(
      'access',
      resourceType,
      'Resource has no company identifier',
      {
        companyId: contextCompanyId,
        resourceType,
        resourceId: resource._id || resource.id,
      }
    );
  }
  
  if (resourceCompanyId !== contextCompanyId) {
    // Log security violation
    logger.messageFlow.error(
      'system',
      'authorization',
      'ownership-violation',
      `SECURITY: Attempted to access ${resourceType} from different company`,
      {
        resourceType,
        resourceId: resource._id || resource.id,
        resourceCompanyId,
        contextCompanyId,
      }
    );
    
    throw new AuthorizationError(
      'access',
      resourceType,
      'Resource belongs to different company',
      {
        expectedCompanyId: contextCompanyId,
        actualCompanyId: resourceCompanyId,
        resourceType,
      }
    );
  }
  
  return true;
}

/**
 * Verify that a customer/contact belongs to the specified company
 * Similar to verifyResourceOwnership but with customer-specific validation
 * 
 * @param {Object} customer - Customer/contact object
 * @param {string} companyId - Expected company ID
 * @returns {boolean} True if customer belongs to company
 * @throws {AuthorizationError} If customer doesn't belong to company
 */
export async function verifyCustomerOwnership(customer, companyId) {
  return verifyResourceOwnership(customer, companyId, 'customer');
}

/**
 * Check if action is allowed for given resource type
 * Can be extended with role-based access control
 * 
 * @param {string} action - Action to check
 * @param {string} resourceType - Resource type
 * @param {Object} context - Context with user/role information
 * @returns {boolean} True if action is allowed
 */
export function isActionAllowed(action, resourceType, context = {}) {
  // For social media bot context, all authenticated actions are allowed
  // since authentication already verifies company ownership
  
  // This can be extended with role-based rules:
  // const { userRole } = context;
  // if (userRole === 'viewer' && ['create', 'update', 'delete'].includes(action)) {
  //   return false;
  // }
  
  return true;
}

/**
 * Decorator/wrapper for tool handlers to enforce authorization
 * Automatically adds authorization check at the start of tool execution
 * 
 * @param {Function} toolHandler - Original tool handler function
 * @param {string} resourceType - Type of resource being accessed
 * @returns {Function} Wrapped tool handler with authorization
 */
export function withAuthorization(toolHandler, resourceType) {
  return async function(params, context) {
    // Determine action from handler name or params
    const action = determineAction(toolHandler.name);
    
    // Verify authorization before executing
    await verifyAuthorization(context, action, resourceType);
    
    // Execute original handler
    return await toolHandler(params, context);
  };
}

/**
 * Determine action type from handler name
 * Helper for withAuthorization decorator
 * 
 * @param {string} handlerName - Name of the handler function
 * @returns {string} Action type
 */
function determineAction(handlerName) {
  const name = handlerName.toLowerCase();
  
  if (name.includes('get') || name.includes('list') || name.includes('view')) {
    return 'view';
  }
  if (name.includes('create') || name.includes('add') || name.includes('book')) {
    return 'create';
  }
  if (name.includes('update') || name.includes('edit') || name.includes('reschedule')) {
    return 'update';
  }
  if (name.includes('delete') || name.includes('remove') || name.includes('cancel')) {
    return 'delete';
  }
  
  return 'access'; // Default fallback
}

export default {
  verifyAuthorization,
  verifyResourceOwnership,
  verifyCustomerOwnership,
  isActionAllowed,
  withAuthorization,
  AuthorizationError,
};

