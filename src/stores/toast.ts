import { reactive, computed } from 'vue';

// ─────────────────────────────────────────────────────────────────────────
// Toast store — basic ephemeral notifications (Phase 1).
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
        const index = state.toasts.findIndex((toast) => toast.id === id);
        if (index !== -1) state.toasts.splice(index, 1);
      }, duration);
    },
  };
}
