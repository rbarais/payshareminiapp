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

  it('a second start() replaces a still-pending timer', () => {
    const loading = useDelayedLoading();
    loading.start(350);
    loading.start(0);
    expect(loading.active.value).toBe(true);
  });
});
