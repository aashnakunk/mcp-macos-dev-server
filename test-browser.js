#!/usr/bin/env node

/**
 * Manual test script for browser tools.
 * 
 * Usage:
 *   node test-browser.js history <query>
 *   node test-browser.js open <url>
 */

import { searchRecentHistory, openUrl } from './dist/tools/browser.js';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  if (!command) {
    console.error('Usage:');
    console.error('  node test-browser.js history <query>');
    console.error('  node test-browser.js open <url>');
    console.error('');
    console.error('Examples:');
    console.error('  node test-browser.js history "reinforcement learning"');
    console.error('  node test-browser.js open "https://www.youtube.com"');
    process.exit(1);
  }

  try {
    if (command === 'history') {
      if (!arg) {
        console.error('Error: Please provide a search query');
        process.exit(1);
      }
      
      console.log(`Searching Chrome history for: "${arg}"`);
      console.log('Looking back: 7 days');
      console.log('Limit: 10 results\n');
      
      const result = await searchRecentHistory(arg, 7, 10);
      
      console.log(`Found ${result.total_found} results:\n`);
      
      if (result.results.length === 0) {
        console.log('No matches found. Try a different query or increase the time window.');
      } else {
        result.results.forEach((entry, index) => {
          console.log(`${index + 1}. ${entry.title}`);
          console.log(`   URL: ${entry.url}`);
          console.log(`   Last visit: ${entry.last_visit}`);
          console.log(`   Visit count: ${entry.visit_count}`);
          console.log('');
        });
      }
    } else if (command === 'open') {
      if (!arg) {
        console.error('Error: Please provide a URL to open');
        process.exit(1);
      }
      
      console.log(`Opening URL: ${arg}\n`);
      
      const result = await openUrl(arg);
      
      if (result.success) {
        console.log('✓ Success:', result.message);
      } else {
        console.error('✗ Error:', result.message);
        process.exit(1);
      }
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Use "history" or "open"');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

