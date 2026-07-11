import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue';

// Lets the hardware / browser back button close an open overlay (sheet,
// dialog, dropdown) instead of navigating the app or quitting.
//
// How it works: when an overlay opens we push a dummy history entry. The next
// back press pops that entry and fires `popstate`, which we intercept to close
// the topmost overlay rather than letting the router navigate. When an overlay
// is closed by any other means (button, tap outside), we pop the dummy entry
// ourselves so the history stays balanced.
//
// The `popstate` listener lives in the router (see router/index.ts) and calls
// `handleModalBack()` first, so there is a single listener and no ordering
// ambiguity between the modal logic and the back-to-quit logic.

interface OpenModal {
  close: () => void;
  // Set to true when the modal is being closed *because* the user pressed back,
  // so we know not to pop an extra history entry on the way out.
  closedByBack: boolean;
}

const stack: OpenModal[] = [];

// Set right before we call history.back() to clean up our own dummy entry, so
// the resulting popstate is ignored rather than treated as a back press.
let ignoreNextPop = false;

// A programmatic close schedules the removal of its dummy history entry on the
// next microtask instead of doing it immediately. If another modal opens in the
// same tick (e.g. the settings sheet closing to open the disconnect dialog), it
// cancels the pending cleanup and reuses the existing entry — so the handoff
// touches history zero times and cannot race with the browser.
let cleanupPending = false;

/**
 * Called by the router's single popstate listener. Returns true when the pop
 * was consumed by the modal layer (a modal was closed, or it was our own
 * cleanup), in which case the router must not run its navigation / quit logic.
 */
export function handleModalBack(): boolean {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return true;
  }
  const top = stack[stack.length - 1];
  if (top) {
    top.closedByBack = true;
    top.close();
    return true;
  }
  return false;
}

export function anyModalOpen(): boolean {
  return stack.length > 0;
}

function register(close: () => void): OpenModal {
  const entry: OpenModal = { close, closedByBack: false };
  stack.push(entry);
  if (cleanupPending) {
    // Another modal just closed this tick: reuse its dummy entry instead of
    // pushing a new one (and cancel the scheduled removal).
    cleanupPending = false;
  } else {
    // Duplicate the router's current state so vue-router sees no location
    // change (delta 0) when this entry is later popped.
    history.pushState(history.state, '');
  }
  return entry;
}

function unregister(entry: OpenModal): void {
  const index = stack.indexOf(entry);
  if (index === -1) return;
  stack.splice(index, 1);
  if (entry.closedByBack) return;

  // Closed programmatically (button, tap outside): drop the dummy entry we
  // pushed on open — but defer it so a modal opening in the same tick can
  // reuse the entry rather than pop-then-push and race the browser.
  cleanupPending = true;
  queueMicrotask(() => {
    if (!cleanupPending) return;
    cleanupPending = false;
    ignoreNextPop = true;
    history.back();
  });
}

/**
 * For overlays rendered as their own component via `v-if` (mount = open,
 * unmount = close). Call once in <script setup>, passing the close handler.
 */
export function useModalBack(close: () => void): void {
  let entry: OpenModal | null = null;
  onMounted(() => {
    entry = register(close);
  });
  onBeforeUnmount(() => {
    if (entry) {
      unregister(entry);
      entry = null;
    }
  });
}

/**
 * For overlays toggled by a boolean ref inside an always-mounted view
 * (e.g. a `v-if` block, a dropdown). Registers while the ref is truthy.
 */
export function useModalBackWhen(isOpen: Ref<boolean>, close: () => void): void {
  let entry: OpenModal | null = null;
  watch(isOpen, (open) => {
    if (open && !entry) {
      entry = register(close);
    } else if (!open && entry) {
      unregister(entry);
      entry = null;
    }
  });
  onBeforeUnmount(() => {
    if (entry) {
      unregister(entry);
      entry = null;
    }
  });
}
