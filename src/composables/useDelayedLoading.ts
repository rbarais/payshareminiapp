import { ref, type Ref } from 'vue';

export const SKELETON_DELAY_MS = 350;

export interface DelayedLoading {
  active: Ref<boolean>;
  start(delayMs?: number): void;
  stop(): void;
}

// Flips `active` immediately when delayMs <= 0 (nothing on screen to protect),
// otherwise only after delayMs elapses — cancelled by stop() if the fetch it
// guards resolves first, so a fast refresh never flickers a skeleton in.
export function useDelayedLoading(): DelayedLoading {
  const active = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function start(delayMs = 0): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (delayMs <= 0) {
      active.value = true;
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      active.value = true;
    }, delayMs);
  }

  function stop(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    active.value = false;
  }

  return { active, start, stop };
}
