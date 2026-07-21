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

  it('does not pop history when the URL already changed since the modal opened (a real navigation happened)', async () => {
    const { useModalBack } = await import('../modalBack');
    const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
    const unmount = mountModal(useModalBack, () => {});

    // Mirrors a router.push() to a new route firing in the same handler that
    // closes the modal (e.g. NotificationsSheet's select -> goToGroup).
    history.pushState(null, '', '#/group/g1');
    unmount();
    await flushMicrotasks();

    expect(backSpy).not.toHaveBeenCalled();
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
