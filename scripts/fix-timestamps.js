#!/usr/bin/env node

/**
 * Fix empty timestamps in the database to stop the infinite loop.
 * This script checks for and fixes any empty lastAgentTimestamp values.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'store', 'messages.db');

console.log('Checking for empty timestamps in database...\n');

try {
  const db = new Database(dbPath);

  // Get current state
  const stateRow = db.prepare('SELECT value FROM router_state WHERE key = ?')
    .get('last_agent_timestamp');

  if (!stateRow) {
    console.log('❌ No last_agent_timestamp found in database');
    db.close();
    process.exit(1);
  }

  const timestamps = JSON.parse(stateRow.value);
  console.log('Current timestamps:');
  console.log(JSON.stringify(timestamps, null, 2));
  console.log();

  // Find empty timestamps
  const emptyTimestamps = [];
  for (const [jid, timestamp] of Object.entries(timestamps)) {
    if (timestamp === '' || !timestamp) {
      emptyTimestamps.push(jid);
    }
  }

  if (emptyTimestamps.length === 0) {
    console.log('✅ No empty timestamps found - database is healthy!');
    db.close();
    process.exit(0);
  }

  console.log(`⚠️  Found ${emptyTimestamps.length} empty timestamp(s):`);
  emptyTimestamps.forEach(jid => console.log(`   - ${jid}`));
  console.log();

  // Fix each empty timestamp
  let fixed = 0;
  for (const jid of emptyTimestamps) {
    // Get the latest message timestamp for this chat
    const latestMsg = db.prepare(`
      SELECT timestamp
      FROM messages
      WHERE chat_jid = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(jid);

    if (latestMsg) {
      timestamps[jid] = latestMsg.timestamp;
      fixed++;
      console.log(`✅ Fixed ${jid} → ${latestMsg.timestamp}`);
    } else {
      // No messages found, set to current time
      timestamps[jid] = new Date().toISOString();
      fixed++;
      console.log(`✅ Fixed ${jid} → ${timestamps[jid]} (current time, no messages found)`);
    }
  }

  // Save updated timestamps
  db.prepare('UPDATE router_state SET value = ? WHERE key = ?')
    .run(JSON.stringify(timestamps), 'last_agent_timestamp');

  console.log();
  console.log(`🎉 Fixed ${fixed} timestamp(s)!`);
  console.log();
  console.log('Next steps:');
  console.log('1. Restart NanoClaw: systemctl --user restart nanoclaw');
  console.log('2. Monitor logs: journalctl --user -u nanoclaw -f');
  console.log('3. Send a test message and verify single response');

  db.close();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
