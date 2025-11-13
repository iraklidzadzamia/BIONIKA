#!/usr/bin/env node
/**
 * Ensure Database Indexes Script
 *
 * This script ensures all MongoDB indexes are created for optimal performance.
 * Run this after deploying to production or when indexes are missing.
 *
 * Usage:
 *   node scripts/ensure-indexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Import models (this triggers index definition)
import {
  Contact,
  Message,
  Appointment,
  Pet,
  Company,
  Location,
  ServiceCategory,
  ServiceItem
} from '@petbuddy/shared/models';
import CompanyIntegration from '../models/CompanyIntegration.js';

const models = [
  { name: 'Contact', model: Contact },
  { name: 'Message', model: Message },
  { name: 'Appointment', model: Appointment },
  { name: 'Pet', model: Pet },
  { name: 'Company', model: Company },
  { name: 'Location', model: Location },
  { name: 'ServiceCategory', model: ServiceCategory },
  { name: 'ServiceItem', model: ServiceItem },
  { name: 'CompanyIntegration', model: CompanyIntegration },
];

async function ensureIndexes() {
  console.log('🔧 Ensuring MongoDB Indexes...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_DOCKER;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log(`📡 Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB\n`);

    // Ensure indexes for each model
    for (const { name, model } of models) {
      try {
        console.log(`📊 Ensuring indexes for ${name}...`);

        // Get existing indexes
        const existingIndexes = await model.collection.getIndexes();
        const existingCount = Object.keys(existingIndexes).length;

        // Create/sync indexes
        await model.syncIndexes();

        // Get new indexes
        const newIndexes = await model.collection.getIndexes();
        const newCount = Object.keys(newIndexes).length;

        console.log(`   ✅ ${name}: ${newCount} indexes (${newCount - existingCount} new)`);

        // List all indexes
        for (const [indexName, indexSpec] of Object.entries(newIndexes)) {
          const keys = Object.keys(indexSpec.key).join(', ');
          console.log(`      - ${indexName}: ${keys}`);
        }
        console.log();

      } catch (error) {
        console.error(`   ❌ Error ensuring indexes for ${name}:`, error.message);
      }
    }

    console.log('\n✅ All indexes ensured successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the script
ensureIndexes()
  .then(() => {
    console.log('\n🎉 Index creation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
