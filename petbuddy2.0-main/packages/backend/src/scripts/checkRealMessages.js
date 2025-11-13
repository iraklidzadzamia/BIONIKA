import mongoose from 'mongoose';
import { Contact, Company, Message } from '@petbuddy/shared';
import { config } from '../config/env.js';

async function checkRealMessages() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB\n');

    // Get company
    const company = await Company.findOne();
    console.log(`📍 Company: ${company.name} (${company._id})\n`);

    // Check ALL messages (not just for this company)
    const allMessages = await Message.find().lean();
    console.log(`📨 TOTAL messages in database: ${allMessages.length}\n`);

    // Check messages for this company
    const companyMessages = await Message.find({ company_id: company._id }).lean();
    console.log(`📨 Messages for ${company.name}: ${companyMessages.length}`);

    if (companyMessages.length > 0) {
      console.log('\n📋 Message Details:');
      companyMessages.forEach((msg, idx) => {
        console.log(`\n${idx + 1}. Message ${msg._id}`);
        console.log(`   Company ID: ${msg.company_id}`);
        console.log(`   Customer ID: ${msg.customer_id}`);
        console.log(`   Lead ID: ${msg.lead_id}`);
        console.log(`   Contact Type: ${msg.contact_type}`);
        console.log(`   Platform: ${msg.platform}`);
        console.log(`   Direction: ${msg.direction}`);
        console.log(`   Content: "${msg.content?.substring(0, 50)}..."`);
        console.log(`   Created: ${msg.created_at}`);
      });
    }

    // Check customers (using Contact model)
    const customers = await Contact.find({
      companyId: company._id,
      contactStatus: 'customer',
    }).lean();
    console.log(`\n👥 Total Customers: ${customers.length}`);
    if (customers.length > 0) {
      customers.forEach((cust, idx) => {
        console.log(`   ${idx + 1}. ${cust.fullName} (${cust._id})`);
      });
    }

    // Check leads (using Contact model)
    const leads = await Contact.find({ companyId: company._id, contactStatus: 'lead' }).lean();
    console.log(`\n🎯 Total Leads: ${leads.length}`);
    if (leads.length > 0) {
      leads.forEach((lead, idx) => {
        console.log(`   ${idx + 1}. ${lead.fullName} (${lead._id})`);
      });
    }

    // Check for orphaned messages (messages with no valid customer/lead)
    console.log('\n🔍 Checking for orphaned messages...');
    let orphanedCount = 0;
    for (const msg of companyMessages) {
      if (msg.customer_id) {
        const customer = await Contact.findOne({ _id: msg.customer_id, contactStatus: 'customer' });
        if (!customer) {
          orphanedCount++;
          console.log(`   ⚠️ Message ${msg._id} has invalid customer_id: ${msg.customer_id}`);
        }
      }
      if (msg.lead_id) {
        const lead = await Contact.findOne({ _id: msg.lead_id, contactStatus: 'lead' });
        if (!lead) {
          orphanedCount++;
          console.log(`   ⚠️ Message ${msg._id} has invalid lead_id: ${msg.lead_id}`);
        }
      }
    }

    if (orphanedCount === 0) {
      console.log('   ✅ All messages have valid references');
    } else {
      console.log(`   ⚠️ Found ${orphanedCount} orphaned messages`);
    }

    // Check messages by platform
    console.log('\n📊 Messages by Platform:');
    const platforms = ['instagram', 'facebook', 'whatsapp', 'telegram', 'web', 'other'];
    for (const platform of platforms) {
      const count = await Message.countDocuments({
        company_id: company._id,
        platform,
      });
      if (count > 0) {
        console.log(`   ${platform}: ${count}`);
      }
    }

    // Check messages by contact_type
    console.log('\n📊 Messages by Contact Type:');
    const withCustomer = await Message.countDocuments({
      company_id: company._id,
      contact_type: 'customer',
    });
    const withLead = await Message.countDocuments({
      company_id: company._id,
      contact_type: 'lead',
    });
    const withoutType = await Message.countDocuments({
      company_id: company._id,
      contact_type: { $exists: false },
    });
    console.log(`   Customer: ${withCustomer}`);
    console.log(`   Lead: ${withLead}`);
    console.log(`   No type: ${withoutType}`);

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRealMessages();
