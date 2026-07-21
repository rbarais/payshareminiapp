import { computed, reactive } from 'vue';
import { useGroupsStore } from '../stores/groups';
import { useSession } from '../stores/session';
import { readLastSeen, writeLastSeen } from '../utils/notificationsStorage';

const state = reactive<{ lastSeenAt: Date | null; storageAvailable: boolean }>({
  lastSeenAt: null,
  storageAvailable: true,
});

let initialized = false;

// First launch (nothing stored yet): initialize lastSeenAt to "now" so we
// never flood the user with retroactive notifications on first open.
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  const stored = readLastSeen();
  if (stored) {
    state.lastSeenAt = stored;
    return;
  }
  const now = new Date();
  state.storageAvailable = writeLastSeen(now);
  state.lastSeenAt = now;
}

export function useNotifications() {
  ensureInitialized();
  const session = useSession();
  const store = useGroupsStore();

  const items = computed(() => store.notifications(session.user.value?.id ?? ''));

  const hasUnread = computed(() => {
    if (!state.storageAvailable || !state.lastSeenAt) return false;
    const lastSeenAt = state.lastSeenAt;
    return items.value.some((item) => item.date.getTime() > lastSeenAt.getTime());
  });

  function markSeen(): void {
    const now = new Date();
    const latestNotificationTime = items.value.length > 0
      ? Math.max(...items.value.map((n) => n.date.getTime()), now.getTime())
      : now.getTime();
    const lastSeenAt = new Date(latestNotificationTime);
    state.lastSeenAt = lastSeenAt;
    state.storageAvailable = writeLastSeen(lastSeenAt);
  }

  return { items, hasUnread, markSeen };
}
