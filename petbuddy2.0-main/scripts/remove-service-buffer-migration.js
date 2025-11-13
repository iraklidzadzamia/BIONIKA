/**
 * Migration script to remove defaultServiceBufferMinutes from all companies
 * 
 * This script unsets the settings.defaultServiceBufferMinutes field from all Company documents
 * in the database as part of removing the service buffer feature.
 * 
 * Usage:
 *   node scripts/remove-service-buffer-migration.js
 * 
 * Environment:
 *   Requires MONGODB_URI environment variable to be set
 */

import mongoose from 'mongoose';
import { Company } from '../packages/shared/src/models/Company.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Checking companies with defaultServiceBufferMinutes...');
    const companiesWithBuffer = await Company.countDocuments({
      'settings.defaultServiceBufferMinutes': { $exists: true }
    });
    console.log(`Found ${companiesWithBuffer} companies with defaultServiceBufferMinutes field`);

    if (companiesWithBuffer === 0) {
      console.log('✅ No companies need migration. Exiting.');
      await mongoose.disconnect();
      return;
    }

    console.log('\n🔧 Removing defaultServiceBufferMinutes from all companies...');
    const result = await Company.updateMany(
      { 'settings.defaultServiceBufferMinutes': { $exists: true } },
      { $unset: { 'settings.defaultServiceBufferMinutes': '' } }
    );

    console.log(`✅ Migration complete!`);
    console.log(`   - Matched: ${result.matchedCount} companies`);
    console.log(`   - Modified: ${result.modifiedCount} companies`);

    console.log('\n🔍 Verifying migration...');
    const remainingCompanies = await Company.countDocuments({
      'settings.defaultServiceBufferMinutes': { $exists: true }
    });

    if (remainingCompanies === 0) {
      console.log('✅ Verification successful! All companies migrated.');
    } else {
      console.log(`⚠️  Warning: ${remainingCompanies} companies still have the field`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
runMigration();

