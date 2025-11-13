import { Contact } from '@petbuddy/shared';

;

/**
 * Get or create a contact by social platform ID
 * @param {string} socialId - Facebook ID, Instagram ID, etc.
 * @param {string} companyId - Company ID
 * @param {string} platform - Platform name (facebook, instagram, etc.)
 * @param {object} profileData - Profile data from platform
 * @returns {Promise<Contact>}
 */
export async function getOrCreateContact(
  socialId,
  companyId,
  platform,
  profileData = {}
) {
  const platformFieldMap = {
    facebook: "social.facebookId",
    instagram: "social.instagramId",
    whatsapp: "social.whatsapp",
  };

  const fieldPath = platformFieldMap[platform];
  if (!fieldPath) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Try to find existing contact
  let contact = await Contact.findOne({
    companyId,
    [fieldPath]: socialId,
  });

  if (contact) {
    // Update profile if new data provided
    if (profileData && Object.keys(profileData).length > 0) {
      contact.profile = { ...contact.profile, ...profileData };
      // Automatically update socialNetworkName from profile.name
      if (profileData.name) {
        contact.socialNetworkName = profileData.name;
      }
      contact.lastMessageAt = new Date();
      contact.messageCount = (contact.messageCount || 0) + 1;
      await contact.save();
    }
    return contact;
  }

  // Create new contact as lead
  const socialData = {};
  if (platform === "facebook") {
    socialData.facebookId = socialId;
  } else if (platform === "instagram") {
    socialData.instagramId = socialId;
  } else if (platform === "whatsapp") {
    socialData.whatsapp = socialId;
  }

  // Use profile name or generate default name
  const displayName =
    profileData.name?.trim() ||
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`;

  contact = await Contact.create({
    companyId,
    fullName: displayName,
    socialNetworkName: profileData.name?.trim() || null, // Auto-populated from profile.name
    social: socialData,
    profile: profileData,
    contactStatus: "lead",
    leadSource: platform,
    leadStage: "new",
    lastMessageAt: new Date(),
    messageCount: 1,
  });

  console.log(
    `[Contact] Created new ${platform} contact: ${contact._id} (${displayName})`
  );
  return contact;
}

/**
 * Get contact by social ID
 * @param {string} socialId - Facebook ID, Instagram ID, etc.
 * @param {string} platform - Platform name
 * @returns {Promise<Contact|null>}
 */
export async function getContactBySocialId(socialId, platform = "facebook") {
  const platformFieldMap = {
    facebook: "social.facebookId",
    instagram: "social.instagramId",
    whatsapp: "social.whatsapp",
  };

  const fieldPath = platformFieldMap[platform];
  if (!fieldPath) {
    return null;
  }

  return await Contact.findOne({ [fieldPath]: socialId });
}

/**
 * Update contact's bot suspension status
 * @param {string} contactId - Contact ID
 * @param {boolean} suspended - Suspension status
 * @param {Date} suspendUntil - Suspension end date
 * @returns {Promise<Contact>}
 */
export async function updateContactBotSuspension(
  contactId,
  suspended,
  suspendUntil
) {
  const update = {
    botSuspended: suspended,
  };

  if (suspendUntil) {
    update.botSuspendUntil = suspendUntil;
  }

  return await Contact.findByIdAndUpdate(contactId, update, { new: true });
}

/**
 * Get contact by chat ID and platform
 * @param {string} chatId - Social platform chat ID
 * @param {string} companyId - Company ID
 * @param {string} platform - Platform name
 * @returns {Promise<Contact|null>}
 */
export async function getContactByChatId(chatId, companyId, platform) {
  const platformFieldMap = {
    facebook: "social.facebookId",
    instagram: "social.instagramId",
    whatsapp: "social.whatsapp",
  };

  const fieldPath = platformFieldMap[platform];
  if (!fieldPath) {
    return null;
  }

  return await Contact.findOne({
    companyId,
    [fieldPath]: chatId,
  });
}

/**
 * Update contact information
 * @param {string} contactId - Contact ID
 * @param {object} updates - Fields to update
 * @returns {Promise<Contact>}
 */
export async function updateContactInfo(contactId, updates) {
  return await Contact.findByIdAndUpdate(contactId, updates, { new: true });
}

/**
 * Convert contact from lead to customer
 * @param {string} contactId - Contact ID
 * @returns {Promise<Contact>}
 */
export async function convertLeadToCustomer(contactId) {
  const contact = await Contact.findById(contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  if (contact.contactStatus === "customer") {
    return contact; // Already a customer
  }

  return await contact.convertToCustomer();
}

// Alias for compatibility with toolHandlers
export const convertContactToCustomer = convertLeadToCustomer;
