import CompanyIntegration from '../models/CompanyIntegration.js';
import { debugAccessToken } from '../utils/meta.js';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

/**
 * Debug script to check Facebook token details
 * Usage: node src/scripts/debugFacebookToken.js
 */

async function debugToken() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Get all integrations with Facebook tokens
    const integrations = await CompanyIntegration.find({
      facebookAccessToken: { $exists: true, $ne: '' },
    }).select('companyId facebookAccessToken facebookTokenExpiresAt facebookTokenSource');

    console.log(`\nFound ${integrations.length} integration(s) with Facebook tokens\n`);

    for (const integration of integrations) {
      console.log('='.repeat(80));
      console.log(`Company ID: ${integration.companyId}`);
      console.log(`Token Source: ${integration.facebookTokenSource}`);
      console.log(`Stored Expiry: ${integration.facebookTokenExpiresAt || 'null (permanent)'}`);

      try {
        const token = integration.facebookAccessToken;
        console.log(`\nCalling Facebook debug_token API...`);

        const debugInfo = await debugAccessToken(token);

        console.log('\n📊 Token Debug Info from Facebook:');
        console.log(JSON.stringify(debugInfo, null, 2));

        if (debugInfo.expires_at === 0) {
          console.log('\n✅ Token is PERMANENT (expires_at = 0)');
        } else if (debugInfo.expires_at) {
          const expiryDate = new Date(debugInfo.expires_at * 1000);
          const now = new Date();
          const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

          console.log(`\n⚠️  Token EXPIRES on: ${expiryDate.toISOString()}`);
          console.log(`   Days until expiry: ${daysUntilExpiry}`);
        } else {
          console.log('\n❓ Token expiry unknown');
        }

      } catch (error) {
        console.error(`\n❌ Error debugging token: ${error.message}`);
      }

      console.log('='.repeat(80));
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugToken();
