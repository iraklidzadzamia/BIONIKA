;
;
import mongoose from 'mongoose';
import { Contact, Message } from '@petbuddy/shared';

// Utility: Get a valid ObjectId or return null
const toObjectId = id => {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const allowedPlatforms = new Set(['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other']);

function normalizePlatform(platform) {
  if (!platform) return null;
  const lower = String(platform).toLowerCase();
  return allowedPlatforms.has(lower) ? lower : null;
}

/**
 * Get unified conversations list - now uses single Contact model
 * Returns all contacts who have messages
 */
export const getUnifiedConversations = async (req, res) => {
  try {
    const { company_id, platform = 'instagram', limit = 50, skip = 0 } = req.body;

    console.log('📥 getUnifiedConversations called with:', {
      company_id,
      platform,
      limit,
      skip,
    });

    const companyId = toObjectId(company_id);
    if (!companyId) {
      console.log('❌ Invalid company_id');
      return res.status(400).json({ message: 'Valid company_id is required' });
    }

    // Support "all" platforms (fetch both facebook and instagram)
    const normalizedPlatform = platform === 'all' ? null : (normalizePlatform(platform) || 'instagram');

    // Build match filter for contacts
    const matchFilter = {
      company_id: companyId,
      contact_id: { $exists: true, $ne: null },
    };

    // Add platform filter if not "all"
    if (normalizedPlatform) {
      matchFilter.platform = normalizedPlatform;
    } else {
      // When "all", only show facebook and instagram
      matchFilter.platform = { $in: ['facebook', 'instagram'] };
    }

    // Single aggregate pipeline for all contacts
    const pipeline = [
      {
        $match: matchFilter,
      },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: '$contact_id',
          latestMessage: { $first: '$$ROOT' },
        },
      },
      {
        $lookup: {
          from: 'contacts',
          localField: '_id',
          foreignField: '_id',
          as: 'contact',
        },
      },
      { $match: { 'contact.0': { $exists: true } } },
      {
        $project: {
          _id: 0,
          contactId: '$_id',
          contactStatus: { $arrayElemAt: ['$contact.contactStatus', 0] },
          fullName: { $arrayElemAt: ['$contact.fullName', 0] },
          socialNetworkName: { $arrayElemAt: ['$contact.socialNetworkName', 0] },
          email: { $arrayElemAt: ['$contact.email', 0] },
          phone: { $arrayElemAt: ['$contact.phone', 0] },
          social: { $arrayElemAt: ['$contact.social', 0] },
          profile: { $arrayElemAt: ['$contact.profile', 0] },
          botSuspended: { $arrayElemAt: ['$contact.botSuspended', 0] },
          botSuspendUntil: { $arrayElemAt: ['$contact.botSuspendUntil', 0] },
          leadStage: { $arrayElemAt: ['$contact.leadStage', 0] },
          // Compute display name: prefer fullName, fallback to profile.name, then socialNetworkName
          name: {
            $ifNull: [
              { $arrayElemAt: ['$contact.fullName', 0] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$contact.profile.name', 0] },
                  {
                    $ifNull: [
                      { $arrayElemAt: ['$contact.socialNetworkName', 0] },
                      'Unknown'
                    ]
                  }
                ]
              }
            ]
          },
          latestMessage: {
            _id: '$latestMessage._id',
            content: '$latestMessage.content',
            created_at: '$latestMessage.created_at',
            direction: '$latestMessage.direction',
            read: '$latestMessage.read',
            delivered: '$latestMessage.delivered',
          },
          platform: '$latestMessage.platform',
          lastMessageAt: '$latestMessage.created_at',
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $skip: Number(skip) },
      { $limit: Number(limit) },
    ];

    // Execute pipeline
    const conversations = await Message.aggregate(pipeline);

    console.log(`📊 Found ${conversations.length} conversations`);

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async conv => {
        const unreadFilter = {
          company_id: companyId,
          contact_id: conv.contactId,
          platform: conv.platform,
          direction: 'inbound',
          read: { $ne: true },
        };

        const unreadCount = await Message.countDocuments(unreadFilter);

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    console.log(`✅ Returning ${conversationsWithUnread.length} conversations`);

    return res.status(200).json({
      conversations: conversationsWithUnread,
      total: conversationsWithUnread.length,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (error) {
    console.error('❌ Error fetching unified conversations:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Get messages for a specific contact
 */
export const getConversationMessages = async (req, res) => {
  try {
    const { contactId, platform, limit = 50, skip = 0 } = req.body;

    const contactObjectId = toObjectId(contactId);
    if (!contactObjectId) {
      return res.status(400).json({
        message: 'Valid contactId is required',
      });
    }

    const normalizedPlatform = normalizePlatform(platform);
    const filter = {
      contact_id: contactObjectId,
      ...(normalizedPlatform ? { platform: normalizedPlatform } : {}),
    };

    const messages = await Message.find(filter)
      .sort({ created_at: 1 }) // Ascending for chat display
      .skip(Number(skip))
      .limit(Number(limit));

    const totalMessages = await Message.countDocuments(filter);

    return res.status(200).json({
      messages,
      totalMessages,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark messages as read for a contact
 */
export const markConversationRead = async (req, res) => {
  try {
    const { contactId, platform } = req.body;

    const contactObjectId = toObjectId(contactId);
    if (!contactObjectId) {
      return res.status(400).json({
        message: 'Valid contactId is required',
      });
    }

    const normalizedPlatform = normalizePlatform(platform);
    const filter = {
      contact_id: contactObjectId,
      direction: 'inbound',
      read: { $ne: true },
      ...(normalizedPlatform ? { platform: normalizedPlatform } : {}),
    };

    const result = await Message.updateMany(filter, {
      $set: { read: true, read_at: new Date() },
    });

    return res.status(200).json({
      message: 'Messages marked as read',
      matched: result.matchedCount ?? result.n,
      modified: result.modifiedCount ?? result.nModified,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update bot suspension status for a contact
 * Supports both toggling and explicit setting with optional suspend-until date
 */
export const toggleBotSuspended = async (req, res) => {
  try {
    const { contactId, botSuspended, botSuspendUntil } = req.body;

    const contactObjectId = toObjectId(contactId);
    if (!contactObjectId) {
      return res.status(400).json({
        message: 'Valid contactId is required',
      });
    }

    const contact = await Contact.findById(contactObjectId);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // If botSuspended is explicitly provided, use it; otherwise toggle
    if (typeof botSuspended === 'boolean') {
      contact.botSuspended = botSuspended;
    } else {
      contact.botSuspended = !contact.botSuspended;
    }

    // Handle botSuspendUntil
    if (contact.botSuspended) {
      // If bot is suspended and a date is provided
      if (botSuspendUntil) {
        const suspendDate = new Date(botSuspendUntil);
        if (!isNaN(suspendDate.getTime()) && suspendDate > new Date()) {
          contact.botSuspendUntil = suspendDate;
        } else {
          contact.botSuspendUntil = null;
        }
      } else if (botSuspendUntil === null) {
        // Explicitly clear the date
        contact.botSuspendUntil = null;
      }
      // If botSuspendUntil not provided, keep existing value
    } else {
      // If bot is being resumed, clear the suspend-until date
      contact.botSuspendUntil = null;
    }

    await contact.save();

    return res.status(200).json({
      message: `Bot ${contact.botSuspended ? 'suspended' : 'resumed'} successfully`,
      botSuspended: contact.botSuspended,
      botSuspendUntil: contact.botSuspendUntil,
      contactId: contact._id,
      contactStatus: contact.contactStatus,
    });
  } catch (error) {
    console.error('Error toggling bot suspended:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
