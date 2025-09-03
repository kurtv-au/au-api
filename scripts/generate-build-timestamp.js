#!/usr/bin/env node

/**
 * Generate build timestamp file
 * Creates .build-timestamp with current UTC timestamp
 */

const fs = require('fs');
const path = require('path');

// Generate current UTC timestamp in ISO format
const timestamp = new Date().toISOString();

// Write to .build-timestamp file in project root
const timestampFile = path.join(process.cwd(), '.build-timestamp');

try {
  fs.writeFileSync(timestampFile, timestamp + '\n', 'utf8');
  console.log(`Build timestamp generated: ${timestamp}`);
  console.log(`Written to: ${timestampFile}`);
} catch (error) {
  console.error('Error generating build timestamp:', error.message);
  process.exit(1);
}