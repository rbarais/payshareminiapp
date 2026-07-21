import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationItem } from '../../utils/notifications';

const mockNotifications = vi.fn<(address: string) => NotificationItem[]>();

vi.mock('../../stores/groups', () => ({
  useGroupsStore: () => ({ notifications: mockNotifications }),
}));
vi.mock('../../stores/session', () => ({
  useSession: () => ({ user: { value: { id: 'NQ_ME', name: 'Moi', addresses: [] } } }),
}));

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: '1',
    kind: 'received',
    groupId: 'g1',
    groupName: 'Vacances Barcelone',
    date: new Date(),
    ...overrides,
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mockNotifications.mockReset();
  });

  it('is unread when an event is more recent than lastSeenAt (first launch = now)', async () => {
    mockNotifications.mockReturnValue([item({ date: new Date(Date.now() + 60_000) })]);
    const { useNotifications } = await import('../useNotifications');
    const notifications = useNotifications();
    expect(notifications.hasUnread.value).toBe(true);
  });

  it('has no unread notification on first launch for past events', async () => {
    mockNotifications.mockReturnValue([item({ date: new Date(Date.now() - 60_000) })]);
    const { useNotifications } = await import('../useNotifications');
    const notifications = useNotifications();
    expect(notifications.hasUnread.value).toBe(false);
  });

  it('markSeen clears the unread flag and persists lastSeenAt', async () => {
    mockNotifications.mockReturnValue([item({ date: new Date(Date.now() + 60_000) })]);
    const { useNotifications } = await import('../useNotifications');
    const notifications = useNotifications();
    expect(notifications.hasUnread.value).toBe(true);
    notifications.markSeen();
    expect(notifications.hasUnread.value).toBe(false);
    expect(localStorage.getItem('payshare_notifications_last_seen')).not.toBeNull();
  });

  it('reads a persisted lastSeenAt instead of defaulting to now', async () => {
    localStorage.setItem(
      'payshare_notifications_last_seen',
      new Date(Date.now() - 3_600_000).toISOString(),
    );
    mockNotifications.mockReturnValue([item({ date: new Date(Date.now() - 1_000) })]);
    const { useNotifications } = await import('../useNotifications');
    const notifications = useNotifications();
    expect(notifications.hasUnread.value).toBe(true);
  });

  it('never flags unread when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mockNotifications.mockReturnValue([item({ date: new Date(Date.now() + 60_000) })]);
    const { useNotifications } = await import('../useNotifications');
    const notifications = useNotifications();
    expect(notifications.hasUnread.value).toBe(false);
    vi.restoreAllMocks();
  });

  it('exposes the raw items from the store', async () => {
    const events = [item({ id: 'a' }), item({ id: 'b' })];
    mockNotifications.mockReturnValue(events);
    const { useNotifications } = await import('../useNotifications');
    const notifications = useNotifications();
    expect(notifications.items.value).toEqual(events);
  });
});
