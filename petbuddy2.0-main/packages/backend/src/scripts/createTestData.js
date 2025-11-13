import mongoose from 'mongoose';
import { Contact, Company, Message } from '@petbuddy/shared';
import { config } from '../config/env.js';

async function createTestData() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB\n');

    // Get company
    const company = await Company.findOne();
    if (!company) {
      console.log('❌ No company found');
      process.exit(1);
    }

    console.log(`📍 Using company: ${company.name} (${company._id})\n`);

    // Create test customer (using Contact model)
    const testCustomer = new Contact({
      companyId: company._id,
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      contactStatus: 'customer',
      social: {
        instagramId: 'john_instagram_123',
        facebookId: 'john_facebook_456',
      },
      profile: {
        name: 'John Doe',
        picture: 'https://via.placeholder.com/150',
      },
    });

    await testCustomer.save();
    console.log(`✅ Created customer: ${testCustomer.fullName} (${testCustomer._id})`);

    // Create test lead (using Contact model)
    const testLead = new Contact({
      companyId: company._id,
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321',
      contactStatus: 'lead',
      social: {
        instagramId: 'jane_instagram_789',
      },
      profile: {
        name: 'Jane Smith',
        picture: 'https://via.placeholder.com/150',
      },
      leadSource: 'instagram',
      leadStage: 'new',
    });

    await testLead.save();
    console.log(`✅ Created lead: ${testLead.fullName} (${testLead._id})`);

    // Create test messages for customer
    const customerMessage1 = new Message({
      company_id: company._id,
      customer_id: testCustomer._id,
      contact_type: 'customer',
      role: 'user',
      platform: 'instagram',
      content: 'Hi, I need to book a grooming appointment',
      direction: 'inbound',
      created_at: new Date(Date.now() - 3600000), // 1 hour ago
    });

    await customerMessage1.save();
    console.log(`✅ Created customer message 1`);

    const customerMessage2 = new Message({
      company_id: company._id,
      customer_id: testCustomer._id,
      contact_type: 'customer',
      role: 'operator',
      platform: 'instagram',
      content: 'Sure! What time works best for you?',
      direction: 'outbound',
      delivered: true,
      created_at: new Date(Date.now() - 3000000), // 50 mins ago
    });

    await customerMessage2.save();
    console.log(`✅ Created customer message 2`);

    // Create test messages for lead
    const leadMessage1 = new Message({
      company_id: company._id,
      lead_id: testLead._id,
      contact_type: 'lead',
      role: 'user',
      platform: 'instagram',
      content: 'Do you offer dog training services?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 1800000), // 30 mins ago
    });

    await leadMessage1.save();
    console.log(`✅ Created lead message 1`);

    const leadMessage2 = new Message({
      company_id: company._id,
      lead_id: testLead._id,
      contact_type: 'lead',
      role: 'operator',
      platform: 'instagram',
      content: 'Yes, we do! Would you like to learn more?',
      direction: 'outbound',
      delivered: true,
      created_at: new Date(Date.now() - 600000), // 10 mins ago
    });

    await leadMessage2.save();
    console.log(`✅ Created lead message 2`);

    console.log('\n📊 Test Data Summary:');
    console.log(`   - 1 Customer: ${testCustomer.fullName}`);
    console.log(`   - 1 Lead: ${testLead.fullName}`);
    console.log(`   - 4 Messages (2 customer, 2 lead)`);

    await mongoose.connection.close();
    console.log('\n✅ Test data created successfully!');
    console.log('\n💡 Now try refreshing the Messages page in your app');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestData();
