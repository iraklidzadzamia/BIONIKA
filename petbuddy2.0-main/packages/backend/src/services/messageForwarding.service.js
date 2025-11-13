import axios from 'axios';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
;
import CompanyIntegration from '../models/CompanyIntegration.js';
import { Contact, Company } from '@petbuddy/shared';
;

/**
 * Message Forwarding Service
 * Forwards operator messages from main backend to Meta Bot server
 * for actual delivery to Facebook/Instagram
 */

class MessageForwardingService {
  constructor() {
    this.metaBotBaseUrl = config.metaBot.baseUrl;
  }

  /**
   * Forward an operator message to the Meta Bot server
   * @param {Object} messageData - The message data to forward
   * @returns {Promise<Object>} - Response from Meta Bot server
   */
  async forwardOperatorMessage(messageData) {
    const { company_id, contact_id, role, platform, content, direction, external_message_id } = messageData;

    // Only forward outbound operator messages to social platforms
    if (direction !== 'outbound' || role !== 'operator') {
      logger.info(`Skipping message forward: direction=${direction}, role=${role}`);
      return { skipped: true, reason: 'Not an outbound operator message' };
    }

    // Only forward to supported social platforms
    if (!['facebook', 'instagram'].includes(platform)) {
      logger.info(`Skipping message forward: platform=${platform} not supported`);
      return { skipped: true, reason: `Platform ${platform} not supported` };
    }

    try {
      // Get company and integration info to retrieve access tokens
      const company = await this.getCompanyInfo(company_id);
      const integration = await this.getCompanyIntegration(company_id);
      if (!company) {
        throw new Error(`Company not found: ${company_id}`);
      }

      // Get contact info to retrieve social media IDs
      const contact = await this.getContactInfo(contact_id);

      if (!contact) {
        throw new Error(`Contact not found: ${contact_id}`);
      }

      // Get the contact's social media ID for the specific platform
      const contactSocialId = this.getContactSocialId(contact, platform);
      if (!contactSocialId) {
        throw new Error(`Contact ${platform} ID not found`);
      }

      // Prepare payload for Meta Bot server
      const payload = {
        company_id,
        customer_id: contact_id,
        platform,
        content,
        external_message_id,
        access_token: this.getAccessToken({ company, integration }, platform),
        customer_social_id: contactSocialId,
      };

      // Forward to appropriate Meta Bot endpoint
      const endpoint = this.getMetaBotEndpoint(platform);
      const response = await this.sendToMetaBot(endpoint, payload);

      logger.info(`Message forwarded successfully to ${platform}:`, {
        messageId: messageData._id,
        platform,
        contactId: contact_id,
        contactStatus: contact.contactStatus,
      });

      return {
        success: true,
        forwarded: true,
        platform,
        response,
      };
    } catch (error) {
      logger.error('Failed to forward message to Meta Bot server:', {
        error: error.message,
        messageData: {
          company_id,
          contact_id,
          platform,
          content: `${content?.substring(0, 100)}...`,
        },
      });

      return {
        success: false,
        forwarded: false,
        error: error.message,
      };
    }
  }

  /**
   * Get company information including access tokens
   */
  async getCompanyInfo(companyId) {
    try {
      return await Company.findById(companyId).lean();
    } catch (error) {
      logger.error('Failed to get company info:', error);
      return null;
    }
  }

  /**
   * Get CompanyIntegration document for tokens and chat IDs
   */
  async getCompanyIntegration(companyId) {
    try {
      return await CompanyIntegration.findOne({ companyId }).lean();
    } catch (error) {
      logger.error('Failed to get company integration:', error);
      return null;
    }
  }

  /**
   * Get contact information including social media IDs
   */
  async getContactInfo(contactId) {
    try {
      return await Contact.findById(contactId).lean();
    } catch (error) {
      logger.error('Failed to get contact info:', error);
      return null;
    }
  }

  /**
   * Get contact's social media ID for the specific platform
   */
  getContactSocialId(contact, platform) {
    switch (platform) {
      case 'facebook':
        return contact.social?.facebookId;
      case 'instagram':
        return contact.social?.instagramId;
      default:
        return null;
    }
  }

  /**
   * Get the appropriate access token for the platform
   */
  getAccessToken({ company, integration }, platform) {
    switch (platform) {
      case 'facebook':
        // Prefer CompanyIntegration token; fallback to legacy field if present
        return integration?.facebookAccessToken || company?.integration?.fbAccessToken || '';
      case 'instagram':
        // Instagram uses the same page access token (stored in CompanyIntegration)
        return integration?.facebookAccessToken || company?.integration?.instagramAccessToken || '';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get the Meta Bot server endpoint for the platform
   */
  getMetaBotEndpoint(platform) {
    switch (platform) {
      case 'facebook':
        return `${this.metaBotBaseUrl}/chat/manual-facebook`;
      case 'instagram':
        return `${this.metaBotBaseUrl}/chat/manual-instagram`;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Send message to Meta Bot server
   * @param {string} endpoint - Meta Bot API endpoint URL
   * @param {Object} payload - Message payload to send
   * @returns {Promise<Object>} Response data from Meta Bot server
   * @throws {Error} If the request fails due to network issues, timeouts, or HTTP errors
   */
  async sendToMetaBot(endpoint, payload) {
    try {
      const response = await axios.post(endpoint, payload, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Meta Bot communication failed:', {
        endpoint,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        payload: {
          company_id: payload.company_id,
          platform: payload.platform,
          customer_social_id: payload.customer_social_id,
        },
      });

      // Provide specific error messages based on error type
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Meta Bot server is not reachable. Message forwarding failed.');
      }

      if (error.code === 'ETIMEDOUT') {
        throw new Error('Meta Bot server timed out. Message forwarding failed.');
      }

      if (error.response) {
        // HTTP error response
        const status = error.response.status;
        const message = error.response.data?.message || error.response.statusText;

        if (status >= 500) {
          throw new Error(`Meta Bot server error (${status}): ${message}`);
        } else if (status >= 400) {
          throw new Error(`Meta Bot client error (${status}): ${message}`);
        }
      }

      // Generic network or unexpected error
      throw new Error(`Failed to communicate with Meta Bot: ${error.message}`);
    }
  }

  /**
   * Health check for Meta Bot server
   */
  async checkMetaBotHealth() {
    try {
      const response = await axios.get(`${this.metaBotBaseUrl}/health`, {
        timeout: 5000,
      });
      return {
        healthy: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }
}

// Export singleton instance
export const messageForwardingService = new MessageForwardingService();
export default messageForwardingService;
