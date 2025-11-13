;
import mongoose from 'mongoose';
import { messageForwardingService } from '../services/messageForwarding.service.js';
import { getSocketInstance } from '../socket/socketServer.js';
import { emitNewMessage } from '../socket/events/messageEvents.js';
import { Message } from '@petbuddy/shared';

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

function normalizeAttachments(input) {
  if (!input) return [];
  if (!Array.isArray(input)) return [];
  return input
    .filter(att => att && typeof att === 'object')
    .map(att => ({
      type: typeof att.type === 'string' ? att.type : 'file',
      url: att.url,
      file_description: att.file_description || '',
    }))
    .filter(att => typeof att.url === 'string' && att.url.length > 0);
}

// --- Add Message ---
export const addMessage = async (req, res) => {
  const {
    company_id,
    contact_id,
    role,
    platform,
    content,
    direction,
    external_message_id,
    attachments,
    created_at,
    updated_at,
    read,
    delivered,
    read_at,
  } = req.body;

  const companyId = toObjectId(company_id);
  const contactId = contact_id ? toObjectId(contact_id) : null;
  const normalizedPlatform = normalizePlatform(platform);

  // Validate: need contact_id
  if (!companyId || !contactId || !role || !normalizedPlatform || !direction) {
    return res.status(400).json({
      message: 'company_id, contact_id, role, platform, and direction are required and must be valid.',
    });
  }

  try {
    // For operator messages to social platforms, attempt to send to Graph API
    let forwardingResult = null;
    let forwardingWarning = null;

    if (
      role === 'operator' &&
      direction === 'outbound' &&
      ['facebook', 'instagram'].includes(normalizedPlatform)
    ) {
      try {
        // Create temporary message object for forwarding
        const tempMessage = {
          company_id: companyId,
          contact_id: contactId,
          role,
          platform: normalizedPlatform,
          content: content || '',
          direction,
          external_message_id,
          attachments: normalizeAttachments(attachments),
          created_at: created_at ? new Date(created_at) : new Date(),
          updated_at: updated_at ? new Date(updated_at) : new Date(),
        };

        // Attempt to send to Graph API
        forwardingResult = await messageForwardingService.forwardOperatorMessage(tempMessage);

        // If forwarding failed, log warning but continue to save message
        if (!forwardingResult.success && !forwardingResult.skipped) {
          console.warn('Message forwarding failed, saving to DB only:', forwardingResult.error);
          forwardingWarning = {
            message: 'Message saved but not delivered to social platform',
            error: forwardingResult.error,
            reason: 'Graph API forwarding failed - message stored locally only',
          };
        }
      } catch (forwardError) {
        // Log error but continue to save message to database
        console.error('Message forwarding failed:', forwardError);
        forwardingWarning = {
          message: 'Message saved but not delivered to social platform',
          error: forwardError.message,
          reason: 'Exception during Graph API forwarding - message stored locally only',
        };
      }
    }

    // Save to database regardless of forwarding result
    const newMessage = new Message({
      company_id: companyId,
      contact_id: contactId,
      role,
      platform: normalizedPlatform,
      content: content || '',
      direction,
      external_message_id,
      attachments: normalizeAttachments(attachments),
      created_at: created_at ? new Date(created_at) : new Date(),
      updated_at: updated_at ? new Date(updated_at) : new Date(),
      read: typeof read === 'boolean' ? read : undefined,
      delivered: typeof delivered === 'boolean' ? delivered : undefined,
      read_at: read_at ? new Date(read_at) : undefined,
    });

    await newMessage.save();

    // Emit socket event for real-time updates
    try {
      const io = getSocketInstance();
      emitNewMessage(io, companyId.toString(), {
        conversationId: contactId.toString(),
        message: {
          id: newMessage._id.toString(),
          contactId: newMessage.contact_id.toString(),
          content: newMessage.content,
          direction: newMessage.direction,
          timestamp: newMessage.created_at,
          read: newMessage.read || false,
          delivered: newMessage.delivered || false,
        },
      });
    } catch (socketError) {
      console.error('Failed to emit socket event for new message:', socketError);
      // Don't fail the request if socket emission fails
    }

    return res.status(201).json({
      message: 'Message created successfully',
      messageData: newMessage,
      forwarding: forwardingResult,
      warning: forwardingWarning, // Include warning if forwarding failed
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCompanyInstagramCustomers = async (req, res) => {
  const { company_id, platform = 'instagram', limit = 50, skip = 0 } = req.body;
  const companyId = toObjectId(company_id);
  if (!companyId)
    return res.status(400).json({ message: 'company_id is required and must be valid.' });

  try {
    const normalizedPlatform = normalizePlatform(platform) || 'instagram';
    const pipeline = [
      { $match: { company_id: companyId, platform: normalizedPlatform } },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: '$contact_id',
          latestInstagramMessage: { $first: '$$ROOT' },
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
      { $addFields: { contact: { $arrayElemAt: ['$contact', 0] } } },
      { $sort: { 'latestInstagramMessage.created_at': -1 } },
      { $skip: Number(skip) },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 0,
          contact_id: '$contact._id',
          fullName: '$contact.fullName',
          socialNetworkName: '$contact.socialNetworkName',
          latestMessage: {
            _id: '$latestInstagramMessage._id',
            content: '$latestInstagramMessage.content',
            created_at: '$latestInstagramMessage.created_at',
            attachments: '$latestInstagramMessage.attachments',
            read: '$latestInstagramMessage.read',
            delivered: '$latestInstagramMessage.delivered',
          },
        },
      },
    ];

    const contacts = await Message.aggregate(pipeline);
    return res.status(200).json({ contacts, limit: Number(limit), skip: Number(skip) });
  } catch (error) {
    console.error('Error fetching Instagram contacts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Get All Messages For A Contact ---
export const getMessagesByCustomer = async (req, res) => {
  const { contact_id, platform, limit = 50, skip = 0 } = req.body;
  const contactId = toObjectId(contact_id);
  if (!contactId)
    return res.status(400).json({ message: 'contact_id is required and must be valid.' });

  try {
    const normalizedPlatform = normalizePlatform(platform);
    const filter = {
      contact_id: contactId,
      ...(normalizedPlatform ? { platform: normalizedPlatform } : {}),
    };
    const messages = await Message.find(filter)
      .sort({ created_at: -1 })
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
    console.error('Error fetching messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Other CRUD (for completeness, but not Instagram-specific) ---
export const getMessageById = async (req, res) => {
  const { _id } = req.body;
  if (!_id) return res.status(400).json({ message: 'Message ID (_id) is required in body.' });

  try {
    const message = await Message.findById(_id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    return res.status(200).json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// --- Mark messages as read for a contact (optionally by platform) ---
export const markMessagesRead = async (req, res) => {
  const { contact_id, platform } = req.body;
  const contactId = toObjectId(contact_id);
  if (!contactId) {
    return res.status(400).json({ message: 'contact_id is required and must be valid.' });
  }
  try {
    const normalizedPlatform = normalizePlatform(platform);
    const filter = {
      contact_id: contactId,
      direction: 'inbound',
      ...(normalizedPlatform ? { platform: normalizedPlatform } : {}),
      read: { $ne: true },
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

export const updateMessage = async (req, res) => {
  const { _id, ...updateFields } = req.body;
  if (!_id) return res.status(400).json({ message: 'Message ID (_id) is required in body.' });

  try {
    const updated = await Message.findByIdAndUpdate(_id, updateFields, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    return res.status(200).json({ message: 'Message updated successfully', messageData: updated });
  } catch (error) {
    console.error('Error updating message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteMessage = async (req, res) => {
  const { _id } = req.body;
  if (!_id) return res.status(400).json({ message: 'Message ID (_id) is required in body.' });

  try {
    const deleted = await Message.findByIdAndDelete(_id);
    if (!deleted) return res.status(404).json({ message: 'Message not found' });
    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
