# NanoClaw Helper Scripts

Utility scripts for maintaining and troubleshooting NanoClaw.

## Timestamp Management

### `fix-timestamps.js`
Repairs empty timestamps in the database that cause infinite processing loops.

**Usage:**
```bash
node scripts/fix-timestamps.js
```

**When to use:**
- When you notice message duplication (agent responding multiple times)
- When containers keep restarting every ~30 minutes
- After database corruption
- When setting up a new chat/group

**What it does:**
1. Scans `last_agent_timestamp` in database
2. Finds any empty or missing timestamps
3. Sets them to the latest message timestamp for that chat
4. Saves the fixed state back to database

**Output example:**
```
Checking for empty timestamps in database...

Current timestamps:
{
  "dm:263495886603026433": "2026-02-11T06:09:55.222Z",
  "guild:1467375127808180256": ""
}

⚠️  Found 1 empty timestamp(s):
   - guild:1467375127808180256

✅ Fixed guild:1467375127808180256 → 2026-02-11T13:26:56.922Z

🎉 Fixed 1 timestamp(s)!
```

### `check-timestamps.js`
Verifies the health of timestamps in the database.

**Usage:**
```bash
node scripts/check-timestamps.js
```

**When to use:**
- Regular health checks (can be automated)
- After running `fix-timestamps.js` to verify
- When debugging message processing issues
- As part of monitoring/alerting

**What it does:**
1. Reads all timestamps from database
2. Validates none are empty
3. Shows age of each timestamp
4. Exits with error code if unhealthy (exit 1)

**Output example:**
```
Timestamp Health Check
==================================================

✅ dm:263495886603026433
   Timestamp: 2026-02-11T06:09:55.222Z (1d ago)
✅ guild:1467375127808180256
   Timestamp: 2026-02-11T13:26:56.922Z (1d ago)

==================================================
Total chats: 2
✅ STATUS: HEALTHY - all timestamps valid
```

## Automated Monitoring

You can add this to cron or a monitoring script:

```bash
# Check timestamps every hour
0 * * * * cd /home/dteske25/nanoclaw && node scripts/check-timestamps.js || echo "⚠️ Timestamp health check failed!"
```

Or use in systemd service monitoring:
```bash
#!/bin/bash
# health-check.sh
if ! node scripts/check-timestamps.js; then
  echo "Unhealthy timestamps detected, attempting repair..."
  node scripts/fix-timestamps.js
  systemctl --user restart nanoclaw
fi
```

## Troubleshooting Common Issues

### Issue: Messages keep duplicating

**Solution:**
```bash
# 1. Fix timestamps
node scripts/fix-timestamps.js

# 2. Restart service
systemctl --user restart nanoclaw

# 3. Monitor logs
journalctl --user -u nanoclaw -f
```

### Issue: Container timeouts every 30 minutes

**Symptom:** Logs show `State 'final-sigterm' timed out. Killing.` every ~30 minutes

**Solution:**
```bash
# 1. Check timestamps
node scripts/check-timestamps.js

# 2. If unhealthy, fix them
node scripts/fix-timestamps.js

# 3. Restart
systemctl --user restart nanoclaw
```

### Issue: Empty timestamps keep appearing

**Symptom:** `check-timestamps.js` shows empty timestamps appearing again after fixing

**This should not happen with the new code (v1.1+)**. If it does:
1. Check that you've rebuilt: `npm run build`
2. Check service is running the new code: `systemctl --user status nanoclaw`
3. File a bug report with logs

## Files Modified in Fix

Related to message duplication fix (2026-02-12):
- `src/index.ts` - Timestamp initialization and error handling
- `src/group-queue.ts` - Circuit breaker and drain safety
- `docs/MESSAGE_DUPLICATION_FIX.md` - Full technical documentation

See `docs/MESSAGE_DUPLICATION_FIX.md` for complete details.
