/**
 * Customer Information Tool Handlers
 *
 * Tools for collecting and updating customer contact information.
 */

import {
  getContactByChatId,
  updateContactInfo,
} from "../../services/contact.service.js";

/**
 * Factory function to create customer tools with platform context
 * @param {string} platform - Platform name (facebook/instagram)
 * @returns {Object} Customer tool handlers
 */
export function createCustomerTools(platform) {
  return {
    /**
     * Get and store customer's full name
     */
    get_customer_full_name: async ({ full_name, chat_id }, context = {}) => {
      const id = chat_id || context.chat_id;
      if (id && context.company_id) {
        const contact = await getContactByChatId(
          id,
          context.company_id,
          platform
        );
        if (contact) {
          await updateContactInfo(contact._id, { fullName: full_name });
        }
      }
      return { full_name };
    },

    /**
     * Get and store customer's full info (name + phone)
     */
    get_customer_info: async (
      { full_name, phone_number, chat_id },
      context = {}
    ) => {
      const id = chat_id || context.chat_id;
      if (id && context.company_id) {
        const contact = await getContactByChatId(
          id,
          context.company_id,
          platform
        );
        if (contact) {
          await updateContactInfo(contact._id, {
            fullName: full_name,
            phone: phone_number,
          });
        }
      }
      return { full_name, phone_number };
    },

    /**
     * Get and store customer's phone number
     */
    get_customer_phone_number: async (
      { phone_number, chat_id },
      context = {}
    ) => {
      const id = chat_id || context.chat_id;
      if (id && context.company_id) {
        const contact = await getContactByChatId(
          id,
          context.company_id,
          platform
        );
        if (contact) {
          await updateContactInfo(contact._id, { phone: phone_number });
        }
      }
      return { phone_number };
    },
  };
}
