import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { User } from '@petbuddy/shared';
import { config } from '../config/env.js';

/**
 * Migration script to set serviceProvider field based on role
 * - Groomers: serviceProvider = true
 * - Managers & Receptionists: serviceProvider = false
 */
async function migrateServiceProvider() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB');

    // Update all groomers to have serviceProvider = true
    const groomerResult = await User.updateMany(
      { role: 'groomer' },
      { $set: { serviceProvider: true } }
    );
    logger.info(`Updated ${groomerResult.modifiedCount} groomers to serviceProvider: true`);

    // Update all managers and receptionists to have serviceProvider = false
    const nonGroomerResult = await User.updateMany(
      { role: { $in: ['manager', 'receptionist'] } },
      { $set: { serviceProvider: false } }
    );
    logger.info(
      `Updated ${nonGroomerResult.modifiedCount} managers/receptionists to serviceProvider: false`
    );

    // Log summary
    const groomerCount = await User.countDocuments({ role: 'groomer', serviceProvider: true });
    const nonGroomerCount = await User.countDocuments({
      role: { $in: ['manager', 'receptionist'] },
      serviceProvider: false,
    });

    logger.info('\n=== Migration Summary ===');
    logger.info(`Total groomers (serviceProvider: true): ${groomerCount}`);
    logger.info(`Total managers/receptionists (serviceProvider: false): ${nonGroomerCount}`);
    logger.info('=========================\n');

    await mongoose.disconnect();
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateServiceProvider();
