#!/usr/bin/env node

/**
 * Check the health of timestamps in the database.
 * Run this periodically to ensure no empty timestamps sneak in.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'store', 'messages.db');

try {
  const db = new Database(dbPath, { readonly: true });

  // Get current state
  const stateRow = db.prepare('SELECT value FROM router_state WHERE key = ?')
    .get('last_agent_timestamp');

  if (!stateRow) {
    console.log('❌ No last_agent_timestamp found in database');
    db.close();
    process.exit(1);
  }

  const timestamps = JSON.parse(stateRow.value);

  console.log('Timestamp Health Check');
  console.log('='.repeat(50));
  console.log();

  let hasEmpty = false;
  let totalChats = 0;

  for (const [jid, timestamp] of Object.entries(timestamps)) {
    totalChats++;
    if (timestamp === '' || !timestamp) {
      console.log(`❌ EMPTY: ${jid}`);
      hasEmpty = true;
    } else {
      const age = Date.now() - new Date(timestamp).getTime();
      const ageMinutes = Math.floor(age / 60000);
      const ageHours = Math.floor(age / 3600000);
      const ageDays = Math.floor(age / 86400000);

      let ageStr;
      if (ageDays > 0) {
        ageStr = `${ageDays}d ago`;
      } else if (ageHours > 0) {
        ageStr = `${ageHours}h ago`;
      } else {
        ageStr = `${ageMinutes}m ago`;
      }

      console.log(`✅ ${jid}`);
      console.log(`   Timestamp: ${timestamp} (${ageStr})`);
    }
  }

  console.log();
  console.log('='.repeat(50));
  console.log(`Total chats: ${totalChats}`);

  if (hasEmpty) {
    console.log('❌ STATUS: UNHEALTHY - empty timestamps detected!');
    console.log('   Run: node scripts/fix-timestamps.js');
    db.close();
    process.exit(1);
  } else {
    console.log('✅ STATUS: HEALTHY - all timestamps valid');
    db.close();
    process.exit(0);
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
