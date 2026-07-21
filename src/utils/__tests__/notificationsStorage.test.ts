import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readLastSeen, writeLastSeen } from '../notificationsStorage';

describe('notificationsStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(readLastSeen()).toBeNull();
  });

  it('persists and rereads a date', () => {
    const date = new Date('2026-07-21T10:00:00Z');
    writeLastSeen(date);
    expect(readLastSeen()).toEqual(date);
  });

  it('tolerates a corrupted value by returning null', () => {
    localStorage.setItem('payshare_notifications_last_seen', 'not a date');
    expect(readLastSeen()).toBeNull();
  });

  it('writeLastSeen returns true on success', () => {
    expect(writeLastSeen(new Date())).toBe(true);
  });

  it('writeLastSeen returns false when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(writeLastSeen(new Date())).toBe(false);
    vi.restoreAllMocks();
  });

  it('readLastSeen returns null when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(readLastSeen()).toBeNull();
    vi.restoreAllMocks();
  });
});
