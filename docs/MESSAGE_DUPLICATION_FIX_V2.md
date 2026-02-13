# Message Duplication Fix V2 - The Real Root Cause

**Date:** 2026-02-12
**Status:** ✅ Implemented and Deployed

## What Went Wrong with V1

The first fix (MESSAGE_DUPLICATION_FIX.md) focused on empty timestamps, but that wasn't the actual root cause. While it prevented one type of infinite loop, **duplicates still occurred** because:

**Container timeouts were treated as errors that triggered cursor rollback.**

## The Real Root Cause

Looking at the logs from 2026-02-12 22:00-22:35:

1. **22:03:03** - Agent successfully responds to message
2. **22:33:03** - Container times out (30 min later, expected behavior)
3. **22:33:09** - Code logs: `"Agent error, rolled back message cursor for retry"`
4. **22:33:14** - Processes **4 messages** (old ones, not new ones)
5. **22:33:24** - **DUPLICATE** - Same response sent again!

### Why This Happened

```typescript
// container-runner.ts line 415
resolve({
  status: 'error',  // ❌ Timeout marked as error
  result: null,
  error: `Container timed out after ${timeout}ms`,
});
```

```typescript
// index.ts line 209-218
if (output === 'error' || hadError) {
  // ❌ All errors trigger rollback, including timeouts!
  lastAgentTimestamp[chatJid] = previousCursor;
  saveState();
}
```

**The problem:** Timeouts are **NOT errors** - they're expected behavior. The agent container:
1. Receives messages
2. Responds successfully
3. Stays alive waiting for more input
4. Times out after 30 minutes of idle time
5. Gets treated as an "error" → triggers rollback → messages reprocessed = duplicates!

## The Fix

**Treat timeouts as success**, not errors:

### src/index.ts (lines 297-318)

```typescript
if (output.status === 'error') {
  // Timeouts are expected behavior after agent finishes responding
  // Don't treat them as errors that should trigger message reprocessing
  const isTimeout = output.error?.includes('Container timed out');

  if (isTimeout) {
    logger.info(
      { group: group.name },
      'Container timed out after processing (expected behavior)',
    );
    return 'success';  // ✅ Don't rollback for timeouts
  }

  logger.error(
    { group: group.name, error: output.error },
    'Container agent error',
  );
  return 'error';
}
```

### src/index.ts (lines 201-207)

```typescript
if (result.status === 'error') {
  // Don't count timeouts as errors - they're expected after agent responds
  const isTimeout = result.error?.includes('Container timed out');
  if (!isTimeout) {
    hadError = true;
  }
}
```

## What This Changes

**Before:**
- Timeout → rollback cursor → retry → duplicate messages
- Every 30 minutes, same messages reprocessed

**After:**
- Timeout → treated as success → cursor stays current
- No rollback, no duplicate messages
- Normal operation continues

## Why V1 Wasn't Enough

V1 fixed empty timestamp infinite loops, which was good for cold starts. But it didn't address the fundamental issue: **timeouts being treated as errors**.

Even with valid timestamps:
- Container successfully processes messages
- Container times out (expected)
- Cursor rolls back (wrong!)
- Messages reprocessed (duplicates!)

## Deployment

```bash
# Build
npm run build

# Restart
systemctl --user restart nanoclaw

# Verify
tail -f /home/dteske25/nanoclaw/logs/nanoclaw.log
```

## Expected Log Output After Fix

When a timeout occurs, you should see:

```
Container timed out after processing (expected behavior)
```

**NOT:**
```
Agent error, rolled back message cursor for retry  ❌
```

## Testing

1. Send a message: `@nano test`
2. Wait 5 minutes → no duplicate
3. Wait 30 minutes → timeout occurs
4. Check logs → should say "expected behavior"
5. Send another message → should work normally
6. **No duplicates at any point**

## Success Criteria

✅ **Fixed** if:
1. Single response per message (no duplicates)
2. Timeouts log as "expected behavior"
3. No "rolled back message cursor" logs after timeouts
4. Normal operation after container timeout

## Technical Details

### Container Lifecycle

```
1. Container starts
   ↓
2. Processes messages
   ↓
3. Sends responses ✅
   ↓
4. Waits for more input (stdin open)
   ↓
5. Idle timeout (30 min) ← This is NORMAL
   ↓
6. Container exits
   ↓
7. Was: marked as error ❌
   Now: marked as success ✅
```

### Why Containers Stay Alive

Containers keep stdin open to allow streaming conversations. The agent can:
- Ask follow-up questions
- Process multiple messages in one session
- Maintain context across exchanges

This is intentional behavior. Timeouts just mean "no more messages came in."

## Related Files

- `src/index.ts` - Fixed error handling for timeouts
- `src/container-runner.ts` - Where timeout error originates
- `docs/MESSAGE_DUPLICATION_FIX.md` - V1 (handled empty timestamps)

## Key Insight

**Not all errors should trigger retries.**

Some "errors" are actually normal shutdown conditions:
- Timeouts after successful processing
- Graceful container exits
- User-initiated stops

Only **actual failures** should trigger:
- Cursor rollback
- Message reprocessing
- Retry logic

## V1 vs V2 Summary

| Issue | V1 | V2 |
|-------|----|----|
| Empty timestamps | ✅ Fixed | ✅ Kept |
| Timeout rollback | ❌ Not addressed | ✅ Fixed |
| Duplicates | ❌ Still occurred | ✅ Resolved |
| Root cause | Empty string loops | Timeout = error |

V2 is the complete fix. V1 was necessary but insufficient.
