import mongoose from 'mongoose';
import LoginAttempt from '../models/LoginAttempt.js';
import { config } from '../config/env.js';

/**
 * Clear login lockouts for a specific email or all emails
 * Usage:
 *   node src/scripts/clearLoginLockout.js
 *   node src/scripts/clearLoginLockout.js --email user@example.com
 *   node src/scripts/clearLoginLockout.js --all
 */
async function clearLoginLockout() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB\n');

    const args = process.argv.slice(2);
    const emailArg = args.find(arg => arg.startsWith('--email='));
    const allArg = args.includes('--all');

    if (emailArg) {
      // Clear lockout for specific email
      const email = emailArg.split('=')[1];
      if (!email) {
        console.error('❌ Please provide an email: --email=user@example.com');
        process.exit(1);
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Remove lockedUntil from all attempts for this email
      const result = await LoginAttempt.updateMany(
        { email: normalizedEmail, lockedUntil: { $exists: true } },
        { $unset: { lockedUntil: '' } }
      );

      console.log(`✅ Cleared lockout for: ${normalizedEmail}`);
      console.log(`   Updated ${result.modifiedCount} record(s)\n`);

      // Also delete old failed attempts
      const deleted = await LoginAttempt.deleteMany({
        email: normalizedEmail,
        successful: false,
      });
      console.log(`   Deleted ${deleted.deletedCount} failed attempt record(s)`);

    } else if (allArg) {
      // Clear ALL lockouts
      const result = await LoginAttempt.updateMany(
        { lockedUntil: { $exists: true } },
        { $unset: { lockedUntil: '' } }
      );

      console.log(`✅ Cleared ALL account lockouts`);
      console.log(`   Updated ${result.modifiedCount} record(s)\n`);

      // Show which emails were locked
      const lockedEmails = await LoginAttempt.distinct('email', {
        lockedUntil: { $exists: true, $ne: null }
      });
      
      if (lockedEmails.length === 0) {
        console.log('   No emails were locked');
      } else {
        console.log(`   Previously locked emails: ${lockedEmails.join(', ')}`);
      }

    } else {
      // Show current lockouts
      const lockedAccounts = await LoginAttempt.find({
        lockedUntil: { $gt: new Date() }
      }).sort({ lockedUntil: 1 });

      if (lockedAccounts.length === 0) {
        console.log('✅ No accounts are currently locked\n');
      } else {
        console.log(`🔒 Found ${lockedAccounts.length} locked account(s):\n`);
        
        lockedAccounts.forEach((attempt, idx) => {
          const remainingMinutes = Math.ceil(
            (attempt.lockedUntil.getTime() - Date.now()) / 60000
          );
          console.log(`${idx + 1}. Email: ${attempt.email}`);
          console.log(`   Locked until: ${attempt.lockedUntil.toLocaleString()}`);
          console.log(`   Remaining: ${remainingMinutes} minute(s)`);
          console.log(`   IP: ${attempt.ip}\n`);
        });

        console.log('\n💡 To clear a specific account:');
        console.log('   node src/scripts/clearLoginLockout.js --email=user@example.com');
        console.log('\n💡 To clear ALL lockouts:');
        console.log('   node src/scripts/clearLoginLockout.js --all');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearLoginLockout();

