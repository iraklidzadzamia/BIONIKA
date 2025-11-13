import mongoose from 'mongoose';
import { Contact, Company, Message } from '@petbuddy/shared';
import { config } from '../config/env.js';

async function testConversations() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected\n');

    // Get company
    const company = await Company.findOne();
    if (!company) {
      console.log('❌ No company found in database');
      process.exit(1);
    }
    console.log(`📍 Company: ${company.name} (${company._id})\n`);

    // Get messages for this company
    const messages = await Message.find({ company_id: company._id }).populate('customer_id').lean();

    console.log(`📨 Found ${messages.length} messages for this company\n`);

    if (messages.length > 0) {
      console.log('Sample message:');
      const msg = messages[0];
      console.log(`  - ID: ${msg._id}`);
      console.log(`  - Customer ID: ${msg.customer_id?._id || msg.customer_id}`);
      console.log(`  - Contact Type: ${msg.contact_type}`);
      console.log(`  - Platform: ${msg.platform}`);
      console.log(`  - Content: ${msg.content}`);
      console.log(`  - Direction: ${msg.direction}`);
    }

    // Get customers with messages (using Contact model)
    const customers = await Contact.find({
      companyId: company._id,
      contactStatus: 'customer',
    }).lean();
    console.log(`\n👥 Found ${customers.length} customers for this company`);

    if (customers.length > 0) {
      console.log('Sample customer:');
      const cust = customers[0];
      console.log(`  - ID: ${cust._id}`);
      console.log(`  - Name: ${cust.fullName}`);
      console.log(`  - Email: ${cust.email}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConversations();
