import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp, defineComponent, h } from 'vue';

function mountModal(useModalBack: (close: () => void) => void, close: () => void) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const Modal = defineComponent({
    setup() {
      useModalBack(close);
      return () => h('div', 'modal');
    },
  });
  const app = createApp(Modal);
  app.mount(el);
  return () => {
    app.unmount();
    el.remove();
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('modalBack', () => {
  beforeEach(() => {
    vi.resetModules();
    history.replaceState(null, '', '#/home');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pops its dummy history entry when closed programmatically with no navigation', async () => {
    const { useModalBack } = await import('../modalBack');
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
    const unmount = mountModal(useModalBack, () => {});

    unmount();
    await flushMicrotasks();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('does not pop history when closeForNavigation() marks the close as a navigation', async () => {
    const { useModalBack, closeForNavigation } = await import('../modalBack');
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
    const unmount = mountModal(useModalBack, () => {});

    closeForNavigation();
    unmount();
    await flushMicrotasks();

    expect(backSpy).not.toHaveBeenCalled();
  });

  it('does not pop history even when cleanup would run before the navigation commits', async () => {
    const { useModalBack, closeForNavigation } = await import('../modalBack');
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
    const unmount = mountModal(useModalBack, () => {});

    // The signal is synchronous, so it holds regardless of whether the cleanup
    // microtask fires before vue-router commits the navigation — the exact
    // ordering race the url-based approach lost.
    closeForNavigation();
    unmount();
    await Promise.resolve();
    history.pushState(null, '', '#/group/g1');
    await flushMicrotasks();

    expect(backSpy).not.toHaveBeenCalled();
  });

  it('consumes the navigation flag once, so the next plain close still cleans up', async () => {
    const { useModalBack, closeForNavigation } = await import('../modalBack');
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});

    const unmountA = mountModal(useModalBack, () => {});
    closeForNavigation();
    unmountA();
    await flushMicrotasks();
    expect(backSpy).not.toHaveBeenCalled();

    const unmountB = mountModal(useModalBack, () => {});
    unmountB();
    await flushMicrotasks();
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('never pops an extra entry when closed via the hardware back button', async () => {
    const { useModalBack, handleModalBack } = await import('../modalBack');
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
    let closed = false;
    const unmount = mountModal(useModalBack, () => {
      closed = true;
    });

    handleModalBack();
    expect(closed).toBe(true);
    unmount();
    await flushMicrotasks();

    expect(backSpy).not.toHaveBeenCalled();
  });

  it('reuses the dummy entry when a new modal opens in the same tick (no extra pushState)', async () => {
    const { useModalBack } = await import('../modalBack');
    const unmountFirst = mountModal(useModalBack, () => {});
    const pushStateSpy = vi.spyOn(history, 'pushState');

    unmountFirst();
    const unmountSecond = mountModal(useModalBack, () => {});
    await flushMicrotasks();

    expect(pushStateSpy).not.toHaveBeenCalled();
    unmountSecond();
    await flushMicrotasks();
  });
});
