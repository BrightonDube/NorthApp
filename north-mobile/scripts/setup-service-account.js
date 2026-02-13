#!/usr/bin/env node

/**
 * Setup script to create service-account.json from environment variable
 * This allows us to store the service account key in .env instead of committing it
 */

const fs = require('fs');
const path = require('path');

// Load .env file if it exists (for local development)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Find ANDROID_SERVICE_ACCOUNT_JSON line
  const match = envContent.match(/ANDROID_SERVICE_ACCOUNT_JSON=(.+?)(?=\n[A-Z_]+=|\n*$)/s);
  if (match && match[1]) {
    process.env.ANDROID_SERVICE_ACCOUNT_JSON = match[1].trim();
  }
}

const serviceAccountJson = process.env.ANDROID_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.error('❌ ANDROID_SERVICE_ACCOUNT_JSON environment variable not found');
  console.error('Make sure it is set in your .env file or CI/CD secrets');
  process.exit(1);
}

try {
  // Parse to validate it's valid JSON
  const parsed = JSON.parse(serviceAccountJson);
  
  // Write to service-account.json
  const targetPath = path.join(__dirname, '..', 'service-account.json');
  fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2));
  
  console.log('✅ service-account.json created successfully from ANDROID_SERVICE_ACCOUNT_JSON');
} catch (error) {
  console.error('❌ Failed to parse or write service account JSON:', error.message);
  process.exit(1);
}
