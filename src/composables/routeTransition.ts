import { ref } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';

// Picks the screen transition for each navigation so the app feels native:
// horizontal push/pop between hierarchy levels, bottom-up for the action
// screens (forms, scanner), and a short fade between the bottom-nav tabs.

// Screens that behave like a modal: they slide up over the current screen and
// slide back down when dismissed.
const MODAL_ROUTES = new Set(['addExpense', 'newGroup', 'pay', 'scan', 'join', 'success']);

// Hierarchy level for the screens that push horizontally. Tabs share level 0.
const DEPTH: Record<string, number> = { home: 0, groups: 0, history: 0, group: 1 };

// Left-to-right order of the bottom nav, so switching tabs slides towards the
// side the user moved to.
const TAB_ORDER: Record<string, number> = { home: 0, groups: 1, history: 2 };

export const transitionName = ref('');

export function updateTransition(to: RouteLocationNormalized, from: RouteLocationNormalized): void {
  const toName = (to.name as string) ?? '';
  const fromName = (from.name as string) ?? '';

  if (!fromName || toName === fromName) {
    transitionName.value = '';
    return;
  }

  const toModal = MODAL_ROUTES.has(toName);
  const fromModal = MODAL_ROUTES.has(fromName);

  if (toModal && fromModal) {
    transitionName.value = 'fade';
  } else if (toModal) {
    transitionName.value = 'modal-in';
  } else if (fromModal) {
    transitionName.value = 'modal-out';
  } else if (toName in TAB_ORDER && fromName in TAB_ORDER) {
    transitionName.value = TAB_ORDER[toName] > TAB_ORDER[fromName] ? 'tabs-forward' : 'tabs-back';
  } else if ((DEPTH[toName] ?? 0) === (DEPTH[fromName] ?? 0)) {
    transitionName.value = 'fade';
  } else {
    transitionName.value =
      (DEPTH[toName] ?? 0) > (DEPTH[fromName] ?? 0) ? 'slide-forward' : 'slide-back';
  }
}
