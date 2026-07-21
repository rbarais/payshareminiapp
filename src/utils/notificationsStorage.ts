const KEY = 'payshare_notifications_last_seen';

export function readLastSeen(): Date | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function writeLastSeen(date: Date): boolean {
  try {
    localStorage.setItem(KEY, date.toISOString());
    return true;
  } catch {
    return false;
  }
}
