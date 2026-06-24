import { reactive, computed } from 'vue';

// ─────────────────────────────────────────────────────────────────────────
// Store toast — notifications éphémères basiques (Phase 1).
// ─────────────────────────────────────────────────────────────────────────

export type ToastType = 'info' | 'error' | 'success';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const state = reactive<{ toasts: Toast[] }>({ toasts: [] });
let seq = 0;

export function useToast() {
  return {
    toasts: computed(() => state.toasts),

    show(message: string, type: ToastType = 'info', duration = 4000): void {
      const id = ++seq;
      state.toasts.push({ id, message, type });
      setTimeout(() => {
        const i = state.toasts.findIndex((t) => t.id === id);
        if (i !== -1) state.toasts.splice(i, 1);
      }, duration);
    },
  };
}
