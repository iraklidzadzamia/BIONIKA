;
import mongoose from 'mongoose';
import { Contact } from '@petbuddy/shared';

// Utility: Get a valid ObjectId or return null
const toObjectId = id => {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

// Create a new lead
export const createLead = async (req, res) => {
  try {
    const {
      companyId,
      fullName,
      phone,
      email,
      social,
      profile,
      source,
      status,
      interestedServices,
      notes,
    } = req.body;

    const companyObjectId = toObjectId(companyId);
    if (!companyObjectId || !source) {
      return res.status(400).json({
        message: 'companyId and source are required',
      });
    }

    // Check for existing lead with same social ID or contact info
    const existingLeadQuery = {
      companyId: companyObjectId,
      contactStatus: 'lead',
      $or: [],
    };

    if (social?.facebookId) {
      existingLeadQuery.$or.push({ 'social.facebookId': social.facebookId });
    }
    if (social?.instagramId) {
      existingLeadQuery.$or.push({ 'social.instagramId': social.instagramId });
    }
    if (phone) {
      existingLeadQuery.$or.push({ phone });
    }
    if (email) {
      existingLeadQuery.$or.push({ email });
    }

    if (existingLeadQuery.$or.length > 0) {
      const existingLead = await Contact.findOne(existingLeadQuery);
      if (existingLead) {
        return res.status(409).json({
          message: 'Lead with this contact information already exists',
          lead: existingLead,
        });
      }
    }

    const newLead = await Contact.create({
      companyId: companyObjectId,
      fullName,
      phone,
      email,
      social,
      profile,
      contactStatus: 'lead',
      leadSource: source,
      leadStage: status || 'new',
      interestedServices,
      notes,
      lastMessageAt: new Date(),
    });

    return res.status(201).json({
      message: 'Lead created successfully',
      lead: newLead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all leads for a company
export const getLeads = async (req, res) => {
  try {
    const { companyId, status, source, limit = 50, skip = 0, search } = req.query;

    const companyObjectId = toObjectId(companyId);
    if (!companyObjectId) {
      return res.status(400).json({ message: 'Valid companyId is required' });
    }

    const filter = { companyId: companyObjectId, contactStatus: 'lead' };

    if (status) {
      filter.leadStage = status;
    }

    if (source) {
      filter.leadSource = source;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const totalLeads = await Contact.countDocuments(filter);

    return res.status(200).json({
      leads,
      total: totalLeads,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get a single lead by ID
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const leadObjectId = toObjectId(id);
    if (!leadObjectId) {
      return res.status(400).json({ message: 'Valid lead ID is required' });
    }

    const lead = await Contact.findOne({ _id: leadObjectId, contactStatus: 'lead' });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.status(200).json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a lead
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const leadObjectId = toObjectId(id);
    if (!leadObjectId) {
      return res.status(400).json({ message: 'Valid lead ID is required' });
    }

    // Don't allow updating companyId or contactStatus
    delete updates.companyId;
    delete updates.contactStatus;

    // Map old field names to new ones if present
    if (updates.source) {
      updates.leadSource = updates.source;
      delete updates.source;
    }
    if (updates.status) {
      updates.leadStage = updates.status;
      delete updates.status;
    }

    const updatedLead = await Contact.findOneAndUpdate(
      { _id: leadObjectId, contactStatus: 'lead' },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.status(200).json({
      message: 'Lead updated successfully',
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Convert lead to customer
export const convertLeadToCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const leadObjectId = toObjectId(id);
    if (!leadObjectId) {
      return res.status(400).json({
        message: 'Valid lead ID is required',
      });
    }

    // Find the lead
    const lead = await Contact.findOne({ _id: leadObjectId, contactStatus: 'lead' });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Use the built-in conversion method
    await lead.convertToCustomer();

    return res.status(200).json({
      message: 'Lead converted to customer successfully',
      contact: lead,
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a lead
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const leadObjectId = toObjectId(id);
    if (!leadObjectId) {
      return res.status(400).json({ message: 'Valid lead ID is required' });
    }

    const deletedLead = await Contact.findOneAndDelete({
      _id: leadObjectId,
      contactStatus: 'lead',
    });

    if (!deletedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.status(200).json({
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update lead message tracking
export const updateLeadMessageTracking = async (req, res) => {
  try {
    const { id } = req.params;

    const leadObjectId = toObjectId(id);
    if (!leadObjectId) {
      return res.status(400).json({ message: 'Valid lead ID is required' });
    }

    const updatedLead = await Contact.findOneAndUpdate(
      { _id: leadObjectId, contactStatus: 'lead' },
      {
        $set: { lastMessageAt: new Date() },
        $inc: { messageCount: 1 },
      },
      { new: true }
    );

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.status(200).json({
      message: 'Lead message tracking updated',
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Error updating lead message tracking:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Suspend/unsuspend bot for a lead
export const toggleBotSuspension = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspend, suspendUntil } = req.body;

    const leadObjectId = toObjectId(id);
    if (!leadObjectId) {
      return res.status(400).json({ message: 'Valid lead ID is required' });
    }

    const updateData = {
      botSuspended: suspend === true,
    };

    if (suspend && suspendUntil) {
      updateData.botSuspendUntil = new Date(suspendUntil);
    } else {
      updateData.botSuspendUntil = null;
    }

    const updatedLead = await Contact.findOneAndUpdate(
      { _id: leadObjectId, contactStatus: 'lead' },
      { $set: updateData },
      { new: true }
    );

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.status(200).json({
      message: `Bot ${suspend ? 'suspended' : 'unsuspended'} successfully`,
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Error toggling bot suspension:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get lead statistics for a company
export const getLeadStatistics = async (req, res) => {
  try {
    const { companyId } = req.query;

    const companyObjectId = toObjectId(companyId);
    if (!companyObjectId) {
      return res.status(400).json({ message: 'Valid companyId is required' });
    }

    const stats = await Contact.aggregate([
      { $match: { companyId: companyObjectId, contactStatus: 'lead' } },
      {
        $group: {
          _id: '$leadStage',
          count: { $sum: 1 },
        },
      },
    ]);

    const sourceStats = await Contact.aggregate([
      { $match: { companyId: companyObjectId, contactStatus: 'lead' } },
      {
        $group: {
          _id: '$leadSource',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = await Contact.countDocuments({
      companyId: companyObjectId,
      contactStatus: 'lead',
    });

    return res.status(200).json({
      totalLeads,
      byStatus: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      bySource: sourceStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching lead statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
