import mongoose from 'mongoose';
import { ServiceCategory } from '@petbuddy/shared';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_DOCKER;

/**
 * Fix grooming services to only allow 'groomer' role, not 'manager'
 */
async function fixGroomingAllowedRoles() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // List of grooming service names
    const groomingServices = [
      'Full Groom',
      'Basic Groom',
      'Bath & Brush',
      'Nail Trim',
      'Cat Groom',
      'Cat Nail Trim',
    ];

    console.log(`\n📋 Updating ${groomingServices.length} grooming services...`);

    for (const serviceName of groomingServices) {
      const result = await ServiceCategory.updateMany(
        {
          name: serviceName,
          allowedRoles: { $in: ['manager'] } // Find services that include 'manager'
        },
        {
          $set: { allowedRoles: ['groomer'] }
        }
      );

      console.log(`  ✓ ${serviceName}: Updated ${result.modifiedCount} record(s)`);
    }

    console.log('\n✅ All grooming services updated successfully!');
    console.log('   Grooming services now only allow role: "groomer"');

    // Verify the changes
    console.log('\n📊 Verification:');
    const services = await ServiceCategory.find({
      name: { $in: groomingServices }
    }).select('name allowedRoles');

    services.forEach(service => {
      console.log(`  ${service.name}: ${JSON.stringify(service.allowedRoles)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
fixGroomingAllowedRoles();
