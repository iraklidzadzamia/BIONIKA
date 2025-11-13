import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import { Contact, Message } from '@petbuddy/shared';
import { config } from '../config/env.js';

/**
 * Migration Script: Convert old Customer/Lead system to unified Contact model
 *
 * This script:
 * 1. Migrates all Customer documents to Contact collection (contactStatus: 'customer')
 * 2. Migrates all Lead documents to Contact collection (contactStatus: 'lead')
 * 3. Updates all Message documents to use contact_id instead of customer_id/lead_id
 */

async function migrateToContactModel() {
  try {
    console.log('🔄 Starting migration to Contact model...\n');

    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Migrate Customers to Contacts
    console.log('📦 Step 1: Migrating Customers to Contacts...');
    const customers = await Customer.find().lean();
    console.log(`Found ${customers.length} customers`);

    let customersCreated = 0;
    let customersSkipped = 0;

    for (const customer of customers) {
      // Check if contact already exists
      const existingContact = await Contact.findById(customer._id);
      if (existingContact) {
        console.log(`⏭️  Contact already exists for customer ${customer._id}`);
        customersSkipped++;
        continue;
      }

      // Create Contact from Customer
      await Contact.create({
        _id: customer._id,
        companyId: customer.companyId,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        social: customer.social,
        profile: customer.profile,
        contactStatus: 'customer', // Mark as customer
        consents: customer.consents,
        preferredLocationId: customer.preferredLocationId,
        loyaltyPoints: customer.loyaltyPoints || 0,
        totalSpent: customer.totalSpent || 0,
        botSuspended: customer.botSuspended,
        botSuspendUntil: customer.botSuspendUntil,
        lastMessageAt: customer.lastMessageAt,
        messageCount: customer.messageCount || 0,
        notes: customer.notes,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      });
      customersCreated++;
    }

    console.log(`✅ Migrated ${customersCreated} customers, skipped ${customersSkipped}\n`);

    // Step 2: Migrate Leads to Contacts
    console.log('📦 Step 2: Migrating Leads to Contacts...');
    const leads = await Lead.find().lean();
    console.log(`Found ${leads.length} leads`);

    let leadsCreated = 0;
    let leadsSkipped = 0;

    for (const lead of leads) {
      // Check if contact already exists
      const existingContact = await Contact.findById(lead._id);
      if (existingContact) {
        console.log(`⏭️  Contact already exists for lead ${lead._id}`);
        leadsSkipped++;
        continue;
      }

      // Create Contact from Lead
      await Contact.create({
        _id: lead._id,
        companyId: lead.companyId,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        social: lead.social,
        profile: lead.profile,
        contactStatus: 'lead', // Mark as lead
        leadSource: lead.source || lead.leadSource,
        leadStage: lead.status || lead.leadStage || 'new',
        qualificationScore: lead.qualificationScore,
        interestedServices: lead.interestedServices,
        botSuspended: lead.botSuspended,
        botSuspendUntil: lead.botSuspendUntil,
        lastMessageAt: lead.lastMessageAt,
        messageCount: lead.messageCount || 0,
        notes: lead.notes,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      });
      leadsCreated++;
    }

    console.log(`✅ Migrated ${leadsCreated} leads, skipped ${leadsSkipped}\n`);

    // Step 3: Update Messages to use contact_id
    console.log('📧 Step 3: Updating Messages to use contact_id...');

    // Update messages with customer_id
    const messagesWithCustomerId = await Message.find({
      customer_id: { $exists: true },
      contact_id: { $exists: false }
    });

    console.log(`Found ${messagesWithCustomerId.length} messages with customer_id`);

    for (const message of messagesWithCustomerId) {
      await Message.updateOne(
        { _id: message._id },
        {
          $set: { contact_id: message.customer_id },
          $unset: { customer_id: '', lead_id: '', contact_type: '' }
        }
      );
    }

    console.log(`✅ Updated ${messagesWithCustomerId.length} messages from customer_id to contact_id`);

    // Update messages with lead_id
    const messagesWithLeadId = await Message.find({
      lead_id: { $exists: true },
      contact_id: { $exists: false }
    });

    console.log(`Found ${messagesWithLeadId.length} messages with lead_id`);

    for (const message of messagesWithLeadId) {
      await Message.updateOne(
        { _id: message._id },
        {
          $set: { contact_id: message.lead_id },
          $unset: { customer_id: '', lead_id: '', contact_type: '' }
        }
      );
    }

    console.log(`✅ Updated ${messagesWithLeadId.length} messages from lead_id to contact_id\n`);

    // Verification
    console.log('🔍 Step 4: Verifying migration...');
    const totalContacts = await Contact.countDocuments();
    const contactCustomers = await Contact.countDocuments({ contactStatus: 'customer' });
    const contactLeads = await Contact.countDocuments({ contactStatus: 'lead' });
    const messagesWithContactId = await Message.countDocuments({ contact_id: { $exists: true } });
    const totalMessages = await Message.countDocuments();

    console.log(`\n📊 Migration Results:`);
    console.log(`Total Contacts: ${totalContacts}`);
    console.log(`  - Customers: ${contactCustomers}`);
    console.log(`  - Leads: ${contactLeads}`);
    console.log(`Messages with contact_id: ${messagesWithContactId} / ${totalMessages}`);

    if (messagesWithContactId === totalMessages) {
      console.log('\n✅ ✅ ✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Warning: ${totalMessages - messagesWithContactId} messages still need migration`);
    }

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run migration
migrateToContactModel()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
