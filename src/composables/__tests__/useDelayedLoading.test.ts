import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDelayedLoading } from '../useDelayedLoading';

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('activates immediately when started with delayMs = 0', () => {
    const loading = useDelayedLoading();
    loading.start(0);
    expect(loading.active.value).toBe(true);
  });

  it('activates immediately when start() is called with no argument', () => {
    const loading = useDelayedLoading();
    loading.start();
    expect(loading.active.value).toBe(true);
  });

  it('does not activate before the delay elapses', () => {
    const loading = useDelayedLoading();
    loading.start(350);
    expect(loading.active.value).toBe(false);
    vi.advanceTimersByTime(349);
    expect(loading.active.value).toBe(false);
  });

  it('activates once the delay elapses', () => {
    const loading = useDelayedLoading();
    loading.start(350);
    vi.advanceTimersByTime(350);
    expect(loading.active.value).toBe(true);
  });

  it('never activates if stop() is called before the delay elapses', () => {
    const loading = useDelayedLoading();
    loading.start(350);
    vi.advanceTimersByTime(200);
    loading.stop();
    vi.advanceTimersByTime(200);
    expect(loading.active.value).toBe(false);
  });

  it('stop() turns off an already-active state', () => {
    const loading = useDelayedLoading();
    loading.start(0);
    expect(loading.active.value).toBe(true);
    loading.stop();
    expect(loading.active.value).toBe(false);
  });

  it('a second start() restarts the delay instead of letting the first timer fire', () => {
    const loading = useDelayedLoading();
    loading.start(350);
    vi.advanceTimersByTime(100);
    loading.start(350);
    vi.advanceTimersByTime(300); // 400ms since the first start(), but only 300ms since the second
    expect(loading.active.value).toBe(false);
    vi.advanceTimersByTime(50); // now 350ms since the second start()
    expect(loading.active.value).toBe(true);
  });

  it('stop() before any start() is a no-op', () => {
    const loading = useDelayedLoading();
    loading.stop();
    expect(loading.active.value).toBe(false);
  });

  it('start(350) while already active stays active', () => {
    const loading = useDelayedLoading();
    loading.start(0);
    expect(loading.active.value).toBe(true);
    loading.start(350);
    expect(loading.active.value).toBe(true);
  });
});
