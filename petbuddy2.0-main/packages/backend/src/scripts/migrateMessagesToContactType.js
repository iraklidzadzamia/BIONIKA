import mongoose from 'mongoose';
;
import { config } from '../config/env.js';
import { Message } from '@petbuddy/shared';

/**
 * Migration script to add contact_type field to existing messages
 * Run this once to migrate old messages to the new schema
 */

async function migrateMessages() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Find all messages without contact_type field
    const messagesWithoutType = await Message.find({
      contact_type: { $exists: false },
    }).countDocuments();

    console.log(`Found ${messagesWithoutType} messages without contact_type`);

    if (messagesWithoutType === 0) {
      console.log('No messages need migration. All good!');
      process.exit(0);
    }

    // Update messages that have customer_id
    const customerResult = await Message.updateMany(
      {
        customer_id: { $exists: true, $ne: null },
        contact_type: { $exists: false },
      },
      {
        $set: { contact_type: 'customer' },
      }
    );

    console.log(
      `Updated ${customerResult.modifiedCount} customer messages with contact_type='customer'`
    );

    // Update messages that have lead_id but no customer_id
    const leadResult = await Message.updateMany(
      {
        lead_id: { $exists: true, $ne: null },
        customer_id: { $exists: false },
        contact_type: { $exists: false },
      },
      {
        $set: { contact_type: 'lead' },
      }
    );

    console.log(`Updated ${leadResult.modifiedCount} lead messages with contact_type='lead'`);

    // Check for any remaining messages without contact_type
    const remaining = await Message.find({
      contact_type: { $exists: false },
    }).countDocuments();

    if (remaining > 0) {
      console.warn(`Warning: ${remaining} messages still don't have contact_type`);
      console.warn('These might be orphaned messages without customer_id or lead_id');
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateMessages();
