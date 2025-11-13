import mongoose from 'mongoose';
import { Contact, Company, Message } from '@petbuddy/shared';
import { config } from '../config/env.js';

async function fixOrphanedMessages() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB\n');

    const company = await Company.findOne();
    console.log(`📍 Company: ${company.name} (${company._id})\n`);

    const messages = await Message.find({ company_id: company._id }).lean();
    console.log(`📨 Checking ${messages.length} messages...\n`);

    let fixedCount = 0;

    for (const msg of messages) {
      let needsFix = false;
      let updates = {};

      // Check if customer_id is actually a lead
      if (msg.customer_id) {
        const customer = await Contact.findOne({ _id: msg.customer_id, contactStatus: 'customer' });
        if (!customer) {
          // Check if it's actually a lead
          const lead = await Contact.findOne({ _id: msg.customer_id, contactStatus: 'lead' });
          if (lead) {
            console.log(`🔧 Fixing message ${msg._id}:`);
            console.log(`   Was: customer_id=${msg.customer_id}, contact_type=${msg.contact_type}`);
            console.log(`   Found: Lead "${lead.fullName}"`);

            updates = {
              customer_id: null,
              lead_id: msg.customer_id,
              contact_type: 'lead',
            };
            needsFix = true;
          } else {
            console.log(
              `⚠️ Message ${msg._id} has invalid customer_id ${msg.customer_id} - no customer or lead found`
            );
          }
        }
      }

      // Check if lead_id is actually a customer
      if (msg.lead_id && !needsFix) {
        const lead = await Contact.findOne({ _id: msg.lead_id, contactStatus: 'lead' });
        if (!lead) {
          const customer = await Contact.findOne({ _id: msg.lead_id, contactStatus: 'customer' });
          if (customer) {
            console.log(`🔧 Fixing message ${msg._id}:`);
            console.log(`   Was: lead_id=${msg.lead_id}, contact_type=${msg.contact_type}`);
            console.log(`   Found: Customer "${customer.fullName}"`);

            updates = {
              lead_id: null,
              customer_id: msg.lead_id,
              contact_type: 'customer',
            };
            needsFix = true;
          } else {
            console.log(
              `⚠️ Message ${msg._id} has invalid lead_id ${msg.lead_id} - no lead or customer found`
            );
          }
        }
      }

      if (needsFix) {
        await Message.updateOne({ _id: msg._id }, { $set: updates });
        console.log(
          `   ✅ Fixed: lead_id=${updates.lead_id}, contact_type=${updates.contact_type}\n`
        );
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} orphaned messages`);

    // Verify
    console.log('\n🔍 Verifying...');
    let stillOrphaned = 0;
    const updatedMessages = await Message.find({ company_id: company._id }).lean();

    for (const msg of updatedMessages) {
      if (msg.customer_id) {
        const customer = await Contact.findOne({ _id: msg.customer_id, contactStatus: 'customer' });
        if (!customer) {
          stillOrphaned++;
          console.log(`   ⚠️ Still orphaned: ${msg._id}`);
        }
      }
      if (msg.lead_id) {
        const lead = await Contact.findOne({ _id: msg.lead_id, contactStatus: 'lead' });
        if (!lead) {
          stillOrphaned++;
          console.log(`   ⚠️ Still orphaned: ${msg._id}`);
        }
      }
    }

    if (stillOrphaned === 0) {
      console.log('   ✅ All messages now have valid references!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixOrphanedMessages();
