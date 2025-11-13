;
;
import logger from './logger.js';
import { Company, User } from '@petbuddy/shared';

/**
 * Check if email is available for user registration
 * @param {string} email - Email to check
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if email is available
 */
export const isUserEmailAvailable = async (email, excludeUserId = null) => {
  try {
    const query = { email: email.toLowerCase() };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query);
    return !existingUser;
  } catch (error) {
    logger.error('Error checking user email availability:', error);
    throw new Error('Failed to check email availability');
  }
};

/**
 * Check if email is available for company registration
 * @param {string} email - Email to check
 * @param {string} excludeCompanyId - Company ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if email is available
 */
export const isCompanyEmailAvailable = async (email, excludeCompanyId = null) => {
  try {
    const query = { email: email.toLowerCase() };
    if (excludeCompanyId) {
      query._id = { $ne: excludeCompanyId };
    }

    const existingCompany = await Company.findOne(query);
    return !existingCompany;
  } catch (error) {
    logger.error('Error checking company email availability:', error);
    throw new Error('Failed to check email availability');
  }
};

/**
 * Check if email can be used for both user and company
 * This allows the same email to be used for both a user account and a company
 * @param {string} email - Email to check
 * @returns {Promise<{userAvailable: boolean, companyAvailable: boolean}>}
 */
export const checkEmailAvailability = async email => {
  try {
    const [userAvailable, companyAvailable] = await Promise.all([
      isUserEmailAvailable(email),
      isCompanyEmailAvailable(email),
    ]);

    return { userAvailable, companyAvailable };
  } catch (error) {
    logger.error('Error checking email availability:', error);
    throw new Error('Failed to check email availability');
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email format is valid
 */
export const isValidEmailFormat = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
