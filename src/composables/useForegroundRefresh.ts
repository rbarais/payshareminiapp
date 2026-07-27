import { onMounted, onUnmounted } from 'vue';

const MIN_INTERVAL_MS = 10_000;

/**
 * Re-runs `refresh` when the app comes back to the foreground (tab switch,
 * WebView backgrounded, bfcache restore). The clock starts at setup time so the
 * view's own onMounted fetch counts as the first run and is not duplicated.
 */
export function useForegroundRefresh(
  refresh: () => Promise<void>,
  minIntervalMs: number = MIN_INTERVAL_MS,
): void {
  let lastRunAt = Date.now();
  let running = false;

  const run = async (): Promise<void> => {
    if (document.visibilityState !== 'visible') return;
    if (running || Date.now() - lastRunAt < minIntervalMs) return;
    running = true;
    lastRunAt = Date.now();
    try {
      await refresh();
    } finally {
      running = false;
      lastRunAt = Date.now();
    }
  };

  onMounted(() => {
    document.addEventListener('visibilitychange', run);
    window.addEventListener('pageshow', run);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', run);
    window.removeEventListener('pageshow', run);
  });
}
