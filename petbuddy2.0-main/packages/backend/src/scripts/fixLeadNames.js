import mongoose from 'mongoose';
import { Contact } from '@petbuddy/shared';
import { config } from '../config/env.js';

async function fixLeadNames() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected\n');

    // Find leads with undefined or missing fullName (using Contact model)
    const leads = await Contact.find({ contactStatus: 'lead' }).lean();
    console.log(`Found ${leads.length} leads\n`);

    for (const lead of leads) {
      if (!lead.fullName || lead.fullName === 'undefined') {
        console.log(`Fixing lead ${lead._id}:`);
        console.log(`  Current name: "${lead.fullName}"`);

        // Try to get name from profile or social
        const newName =
          lead.profile?.name ||
          lead.email?.split('@')[0] ||
          lead.phone ||
          `Lead ${lead._id.toString().substring(0, 6)}`;

        await Contact.updateOne({ _id: lead._id }, { $set: { fullName: newName } });

        console.log(`  Updated to: "${newName}"\n`);
      } else {
        console.log(`✅ Lead ${lead._id}: "${lead.fullName}" - OK`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLeadNames();
