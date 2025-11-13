import mongoose from 'mongoose';
import { Message } from '@petbuddy/shared';
import { config } from '../config/env.js';

async function fixMessages() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');

    // Check total messages
    const totalMessages = await Message.countDocuments();
    console.log(`\n📊 Total messages in database: ${totalMessages}`);

    // Check messages with contact_type
    const withType = await Message.countDocuments({ contact_type: { $exists: true } });
    console.log(`✅ Messages with contact_type: ${withType}`);

    // Check messages without contact_type
    const withoutType = await Message.countDocuments({ contact_type: { $exists: false } });
    console.log(`⚠️  Messages WITHOUT contact_type: ${withoutType}`);

    if (withoutType > 0) {
      console.log('\n🔧 Fixing messages...\n');

      // Fix messages with customer_id
      const customerMessages = await Message.updateMany(
        {
          customer_id: { $exists: true, $ne: null },
          contact_type: { $exists: false },
        },
        {
          $set: { contact_type: 'customer' },
        }
      );

      console.log(
        `✅ Fixed ${customerMessages.modifiedCount} messages - set contact_type='customer'`
      );

      // Fix messages with lead_id
      const leadMessages = await Message.updateMany(
        {
          lead_id: { $exists: true, $ne: null },
          contact_type: { $exists: false },
        },
        {
          $set: { contact_type: 'lead' },
        }
      );

      console.log(`✅ Fixed ${leadMessages.modifiedCount} messages - set contact_type='lead'`);
    }

    // Final check
    const stillMissing = await Message.countDocuments({ contact_type: { $exists: false } });
    if (stillMissing > 0) {
      console.log(`\n⚠️  WARNING: ${stillMissing} messages still missing contact_type`);

      // Show sample
      const sample = await Message.findOne({ contact_type: { $exists: false } }).lean();
      console.log('Sample message:', JSON.stringify(sample, null, 2));
    } else {
      console.log('\n✅ All messages now have contact_type field!');
    }

    // Show summary
    console.log('\n📊 Summary:');
    const customers = await Message.countDocuments({ contact_type: 'customer' });
    const leads = await Message.countDocuments({ contact_type: 'lead' });
    console.log(`   Customer messages: ${customers}`);
    console.log(`   Lead messages: ${leads}`);
    console.log(`   Total: ${customers + leads}`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixMessages();
