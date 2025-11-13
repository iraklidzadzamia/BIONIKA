#!/usr/bin/env node
/**
 * Check Database Indexes Script
 *
 * Quickly check which indexes exist in your MongoDB collections.
 *
 * Usage:
 *   node scripts/check-indexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function checkIndexes() {
  console.log('🔍 Checking MongoDB Indexes...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_DOCKER;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log(`📡 Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected\n`);

    const db = mongoose.connection.db;

    // Collections to check
    const collections = [
      'contacts',
      'messages',
      'appointments',
      'pets',
      'companies',
      'locations',
      'servicecategories',
      'serviceitems',
      'companyintegrations',
    ];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();

        console.log(`📊 ${collectionName.toUpperCase()} (${indexes.length} indexes):`);

        for (const index of indexes) {
          const keys = Object.entries(index.key)
            .map(([field, direction]) => `${field}: ${direction}`)
            .join(', ');

          const unique = index.unique ? ' [UNIQUE]' : '';
          const sparse = index.sparse ? ' [SPARSE]' : '';
          const name = index.name !== '_id_' ? ` (${index.name})` : '';

          console.log(`   ✅ {${keys}}${unique}${sparse}${name}`);
        }
        console.log();

      } catch (error) {
        console.log(`   ⚠️  Collection '${collectionName}' not found or error: ${error.message}\n`);
      }
    }

    // Summary
    console.log('\n📈 Recommendations:');
    console.log('   - If indexes are missing, run: npm run ensure-indexes');
    console.log('   - Check query performance with: db.collection.explain()');
    console.log('   - Monitor slow queries in MongoDB logs\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
checkIndexes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
