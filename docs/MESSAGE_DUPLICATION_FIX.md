# Message Duplication Fix - Implementation Summary

**Date:** 2026-02-12
**Status:** ✅ Implemented and Deployed

## Problem Summary

NanoClaw was experiencing message duplication where agent responses would repeat 4-5 times, seemingly "every 30 minutes". This was caused by an **infinite processing loop** triggered by empty timestamps in the database.

### Root Cause

The guild channel's `last_agent_timestamp` was stored as an empty string ("") in the database, creating this cycle:

1. Message loop runs every 2 seconds (POLL_INTERVAL)
2. Calls `getMessagesSince(chatJid, lastAgentTimestamp[chatJid] || "")` with empty string
3. Returns **ALL messages** from chat history (not just new ones)
4. Container processes messages, times out after 30 minutes (CONTAINER_TIMEOUT)
5. `drainGroup()` sees `pendingMessages = true` → immediately starts new container
6. **Loop repeats forever** every 30 minutes!

### Evidence

- Database: `"guild:1467375127808180256":""` (empty timestamp)
- Container logs: Timeout every ~30 minutes (Feb 11: 7:04, 7:34, 8:05, 8:38, 9:09, 9:40)
- CONTAINER_TIMEOUT = 1800000ms (30 minutes) matched the interval exactly

## Fixes Implemented

### 1. Timestamp Initialization in Message Loop
**File:** `src/index.ts` (lines 338-367)

**What changed:**
- Before calling `getMessagesSince()`, check if `lastAgentTimestamp[chatJid]` is empty
- If empty, initialize to the first trigger message timestamp (or latest message)
- This prevents fetching all messages from chat history

**Code added:**
```typescript
// Initialize empty/missing timestamps to prevent fetching all message history
if (!lastAgentTimestamp[chatJid] || lastAgentTimestamp[chatJid] === '') {
  const firstTriggerMsg = groupMessages.find((m) =>
    TRIGGER_PATTERN.test(m.content.trim()),
  );
  if (firstTriggerMsg) {
    lastAgentTimestamp[chatJid] = firstTriggerMsg.timestamp;
    saveState();
    logger.info({ chatJid }, 'Initialized lastAgentTimestamp for new chat');
  } else {
    lastAgentTimestamp[chatJid] = groupMessages[groupMessages.length - 1].timestamp;
    saveState();
    logger.info({ chatJid }, 'Initialized lastAgentTimestamp to latest message');
  }
}
```

### 2. Prevent Rollback to Empty String
**File:** `src/index.ts` (lines 195-213)

**What changed:**
- In error handling, check if `previousCursor` is empty before rolling back
- If previousCursor is empty, skip the rollback to break the infinite loop

**Code added:**
```typescript
if (previousCursor && previousCursor !== '') {
  lastAgentTimestamp[chatJid] = previousCursor;
  saveState();
  logger.warn({ group: group.name }, 'Agent error, rolled back message cursor for retry');
} else {
  logger.warn(
    { group: group.name, chatJid },
    'Skipping cursor rollback to prevent infinite loop (previousCursor was empty)',
  );
}
```

### 3. Safety Check in processGroupMessages
**File:** `src/index.ts` (lines 128-143)

**What changed:**
- Added safety check at start of `processGroupMessages()` to initialize empty timestamps
- Sets to current time and skips processing to avoid infinite history fetch

### 4. Drain Loop Safety
**File:** `src/group-queue.ts` (lines 255-265)

**What changed:**
- In `drainGroup()`, check if `retryCount > 0` before calling `runForGroup()`
- If retry is already scheduled, clear `pendingMessages` flag and return
- This prevents double-processing from both drain and scheduled retry

**Code added:**
```typescript
if (state.pendingMessages) {
  // Safety: If we just failed (retryCount > 0), don't immediately drain
  // Let the scheduled retry handle it instead to prevent double-processing
  if (state.retryCount > 0) {
    logger.debug({ groupJid }, 'Skipping drain - retry already scheduled');
    state.pendingMessages = false; // Clear the flag
    return;
  }
  this.runForGroup(groupJid, 'drain');
  return;
}
```

### 5. Circuit Breaker Implementation
**File:** `src/group-queue.ts` (lines 17-26, 220-260)

**What changed:**
- Added `lastFailureTime` and `consecutiveFailures` to GroupState interface
- Track consecutive failures over time (within 5-minute windows)
- After 10 consecutive failures, stop retrying and clear `pendingMessages`
- Reset counters on success

**Benefits:**
- Prevents infinite retry loops even if timestamps get corrupted again
- Automatically recovers from persistent failure states

### 6. Recovery Function Update
**File:** `src/index.ts` (lines 387-410)

**What changed:**
- Updated `recoverPendingMessages()` to handle empty timestamps
- Initializes to current time instead of fetching all history on recovery

## Helper Scripts Created

### 1. `scripts/fix-timestamps.js`
**Purpose:** Fix empty timestamps in the database

**Usage:**
```bash
node scripts/fix-timestamps.js
```

**What it does:**
- Checks for empty timestamps in `last_agent_timestamp`
- Sets them to the latest message timestamp for that chat
- Outputs what was fixed and next steps

### 2. `scripts/check-timestamps.js`
**Purpose:** Verify database timestamp health

**Usage:**
```bash
node scripts/check-timestamps.js
```

**What it does:**
- Displays all timestamps and their ages
- Flags any empty timestamps
- Exits with error code if unhealthy (useful for monitoring)

## Deployment Steps Taken

1. ✅ Implemented all code fixes
2. ✅ Compiled TypeScript (`npm run build`)
3. ✅ Ran `fix-timestamps.js` to repair database
   - Fixed: `guild:1467375127808180256` → `2026-02-11T13:26:56.922Z`
4. ✅ Verified with `check-timestamps.js` - all timestamps healthy
5. ✅ Restarted service (`systemctl --user restart nanoclaw`)

## Monitoring & Verification

### Immediate Checks (Complete ✅)

1. ✅ Database repaired - no empty timestamps
2. ✅ Service restarted successfully
3. ✅ No errors in recent logs

### Short-term Monitoring (Next 24-48 hours)

**Check for these log messages that indicate the fixes are working:**

```bash
# Should NOT see:
journalctl --user -u nanoclaw | grep "Initialized lastAgentTimestamp"

# Should NOT see continuous container starts every 30 minutes:
journalctl --user -u nanoclaw | grep "Starting container"

# Check for circuit breaker activations (shouldn't happen in normal operation):
journalctl --user -u nanoclaw | grep "Circuit breaker"

# Check for rollback skips (only during errors):
journalctl --user -u nanoclaw | grep "Skipping cursor rollback"
```

**Verify database health periodically:**
```bash
node scripts/check-timestamps.js
```

### Test Cases

1. **Test single response:**
   - Send `@nano test` to guild channel
   - Verify exactly ONE response
   - Wait 5 minutes → no additional responses
   - Wait 30 minutes → no additional responses

2. **Test error recovery:**
   - Send a message that might cause an error
   - Verify retries happen but don't create infinite loop
   - Verify circuit breaker activates if errors persist (after 10 failures)

3. **Test new chat initialization:**
   - Create a test scenario with a new chat (if possible)
   - Verify timestamp is initialized correctly
   - Look for "Initialized lastAgentTimestamp" log

## Success Criteria

✅ **Fixed** - If all these conditions are met:

1. No message duplication (single response per trigger)
2. No empty timestamps in database (verified by `check-timestamps.js`)
3. No container timeout loops every 30 minutes
4. Normal operation resumes - agent responds once and stops cleanly

## Rollback Plan

If issues occur, rollback by:

1. Check out previous commit:
   ```bash
   git log --oneline -5  # Find commit before fixes
   git checkout <commit-hash>
   npm run build
   ```

2. Manually fix database:
   ```bash
   node scripts/fix-timestamps.js  # Still useful!
   ```

3. Restart service:
   ```bash
   systemctl --user restart nanoclaw
   ```

## Technical Details

### Why Every 30 Minutes?

The interval matched `CONTAINER_TIMEOUT = 1800000ms` (30 minutes):
- Container processes duplicate messages
- Runs for 30 minutes (timeout)
- Exits with timeout error
- `drainGroup()` sees `pendingMessages = true`
- Immediately starts new container
- Repeat!

### Why Empty Timestamp Caused Infinite Loop?

```typescript
// Before fix - DANGEROUS:
getMessagesSince(chatJid, lastAgentTimestamp[chatJid] || '', ASSISTANT_NAME)
//                                                       ^^
//                                                Empty string = fetch ALL messages!
```

In SQL, this becomes:
```sql
-- With empty timestamp:
SELECT * FROM messages WHERE chat_jid = ? AND timestamp > '' ORDER BY timestamp
-- Returns EVERYTHING (all timestamps > empty string)

-- With proper timestamp:
SELECT * FROM messages WHERE chat_jid = ? AND timestamp > '2026-02-11T13:26:56.922Z' ORDER BY timestamp
-- Returns only NEW messages
```

## Additional Notes

- The circuit breaker provides defense-in-depth protection
- All fixes are defensive and won't break existing behavior
- Helper scripts can be used for ongoing monitoring
- Logging improvements help diagnose future issues

## Related Files

- `src/index.ts` - Main orchestrator, message loop
- `src/group-queue.ts` - Queue management, retry logic
- `src/db.ts` - Database operations
- `scripts/fix-timestamps.js` - Database repair utility
- `scripts/check-timestamps.js` - Health check utility
