#!/usr/bin/env node
/**
 * Diagnostic Script: Check Facebook Integration
 *
 * This script helps diagnose why "Company not found" errors occur
 * Run with: node scripts/check-facebook-integration.js
 */

import { connectDB, disconnectDB } from '../config/database.js';
import CompanyIntegration from '../models/CompanyIntegration.js';
import { Company } from '@petbuddy/shared';

const FACEBOOK_PAGE_ID = '602445226293374'; // From error logs

async function checkIntegration() {
  try {
    console.log('🔍 Checking Facebook Integration...\n');

    // Connect to database
    console.log('📡 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Check if integration exists by Facebook Chat ID
    console.log(`📋 Step 1: Looking for integration with facebookChatId: ${FACEBOOK_PAGE_ID}`);
    const integrationByFbId = await CompanyIntegration.findOne({
      facebookChatId: FACEBOOK_PAGE_ID
    }).lean();

    if (integrationByFbId) {
      console.log('✅ FOUND integration by Facebook Chat ID:');
      console.log(JSON.stringify(integrationByFbId, null, 2));

      // Check if company exists
      const company = await Company.findById(integrationByFbId.companyId).lean();
      if (company) {
        console.log(`✅ Company found: ${company.name}`);
        console.log(`   Bot Active: ${company.bot?.active ? 'YES' : 'NO'}`);
      } else {
        console.log('❌ WARNING: Integration exists but company not found!');
        console.log(`   Company ID: ${integrationByFbId.companyId}`);
      }
    } else {
      console.log('❌ NOT FOUND - No integration with this Facebook Chat ID\n');

      // Step 2: Show all integrations to help identify the issue
      console.log('📋 Step 2: Listing ALL company integrations:');
      const allIntegrations = await CompanyIntegration.find({}).lean();

      if (allIntegrations.length === 0) {
        console.log('❌ No integrations found in database at all!');
        console.log('\n💡 SOLUTION: You need to create a company integration.');
        console.log('   Run this command in MongoDB or use the backend admin panel:\n');
        console.log('   db.companyintegrations.insertOne({');
        console.log(`     facebookChatId: "${FACEBOOK_PAGE_ID}",`);
        console.log('     facebookAccessToken: "YOUR_FB_PAGE_ACCESS_TOKEN",');
        console.log('     companyId: ObjectId("YOUR_COMPANY_ID"),');
        console.log('     openaiApiKey: "YOUR_OPENAI_KEY",');
        console.log('     createdAt: new Date(),');
        console.log('     updatedAt: new Date()');
        console.log('   });\n');
      } else {
        console.log(`Found ${allIntegrations.length} integration(s):\n`);

        for (const integration of allIntegrations) {
          const company = await Company.findById(integration.companyId).lean();
          console.log('─────────────────────────────────');
          console.log(`Company: ${company?.name || 'Unknown'}`);
          console.log(`Company ID: ${integration.companyId}`);
          console.log(`Facebook Chat ID: ${integration.facebookChatId || 'NOT SET'} ${integration.facebookChatId === FACEBOOK_PAGE_ID ? '✅ MATCH!' : ''}`);
          console.log(`Instagram Chat ID: ${integration.instagramChatId || 'NOT SET'}`);
          console.log(`Has FB Token: ${integration.facebookAccessToken ? 'YES' : 'NO'}`);
          console.log(`Has OpenAI Key: ${integration.openaiApiKey ? 'YES' : 'NO'}`);
        }
        console.log('─────────────────────────────────\n');

        // Check if any integration is missing facebookChatId
        const missingFbId = allIntegrations.find(i => !i.facebookChatId);
        if (missingFbId) {
          const company = await Company.findById(missingFbId.companyId).lean();
          console.log('💡 SOLUTION: Found an integration without facebookChatId!');
          console.log(`   Company: ${company?.name}`);
          console.log(`   Update it with this command:\n`);
          console.log(`   db.companyintegrations.updateOne(`);
          console.log(`     { _id: ObjectId("${missingFbId._id}") },`);
          console.log(`     { $set: { facebookChatId: "${FACEBOOK_PAGE_ID}" } }`);
          console.log(`   );\n`);
        }
      }
    }

    // Step 3: Verify the Facebook Page ID
    console.log('\n📋 Step 3: Verify your Facebook Page ID');
    console.log(`Expected Page ID from logs: ${FACEBOOK_PAGE_ID}`);
    console.log('\nTo verify this is correct, run:');
    console.log('curl "https://graph.facebook.com/v18.0/me?access_token=YOUR_FB_PAGE_TOKEN"\n');

    await disconnectDB();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkIntegration();
