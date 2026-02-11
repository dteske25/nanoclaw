import { describe, it, expect, beforeEach } from 'vitest';

import { _initTestDatabase, getAllChats, storeChatMetadata } from './db.js';
import { getAvailableGroups, _setRegisteredGroups } from './index.js';

beforeEach(() => {
  _initTestDatabase();
  _setRegisteredGroups({});
});

// --- JID ownership patterns ---

describe('JID ownership patterns', () => {
  // These test the patterns that will become ownsJid() on the Channel interface

  it('Discord guild JID: starts with guild:', () => {
    const jid = 'guild:123456789012345678';
    expect(jid.startsWith('guild:')).toBe(true);
  });

  it('Discord DM JID: starts with dm:', () => {
    const jid = 'dm:123456789012345678';
    expect(jid.startsWith('dm:')).toBe(true);
  });

  it('unknown JID format: does not match Discord patterns', () => {
    const jid = 'unknown:12345';
    expect(jid.startsWith('guild:')).toBe(false);
    expect(jid.startsWith('dm:')).toBe(false);
  });
});

// --- getAvailableGroups ---

describe('getAvailableGroups', () => {
  it('returns only guild: JIDs', () => {
    storeChatMetadata('guild:111', '2024-01-01T00:00:01.000Z', 'Server 1');
    storeChatMetadata('dm:222', '2024-01-01T00:00:02.000Z', 'User DM');
    storeChatMetadata('guild:333', '2024-01-01T00:00:03.000Z', 'Server 2');

    const groups = getAvailableGroups();
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.jid.startsWith('guild:'))).toBe(true);
  });

  it('excludes __group_sync__ sentinel', () => {
    storeChatMetadata('__group_sync__', '2024-01-01T00:00:00.000Z');
    storeChatMetadata('guild:111', '2024-01-01T00:00:01.000Z', 'Server');

    const groups = getAvailableGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].jid).toBe('guild:111');
  });

  it('marks registered groups correctly', () => {
    storeChatMetadata('guild:111', '2024-01-01T00:00:01.000Z', 'Registered');
    storeChatMetadata('guild:222', '2024-01-01T00:00:02.000Z', 'Unregistered');

    _setRegisteredGroups({
      'guild:111': {
        name: 'Registered',
        folder: 'registered',
        trigger: '@nano',
        added_at: '2024-01-01T00:00:00.000Z',
      },
    });

    const groups = getAvailableGroups();
    const reg = groups.find((g) => g.jid === 'guild:111');
    const unreg = groups.find((g) => g.jid === 'guild:222');

    expect(reg?.isRegistered).toBe(true);
    expect(unreg?.isRegistered).toBe(false);
  });

  it('returns groups ordered by most recent activity', () => {
    storeChatMetadata('guild:111', '2024-01-01T00:00:01.000Z', 'Old');
    storeChatMetadata('guild:222', '2024-01-01T00:00:05.000Z', 'New');
    storeChatMetadata('guild:333', '2024-01-01T00:00:03.000Z', 'Mid');

    const groups = getAvailableGroups();
    expect(groups[0].jid).toBe('guild:222');
    expect(groups[1].jid).toBe('guild:333');
    expect(groups[2].jid).toBe('guild:111');
  });

  it('returns empty array when no chats exist', () => {
    const groups = getAvailableGroups();
    expect(groups).toHaveLength(0);
  });
});
