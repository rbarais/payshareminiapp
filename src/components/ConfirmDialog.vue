<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="dialog">
      <div class="dialog-title">{{ title }}</div>
      <div v-if="body" class="dialog-body">{{ body }}</div>
      <div class="dialog-actions">
        <button class="btn-cancel" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button class="btn-confirm" :class="{ danger }" @click="emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useModalBack } from '../composables/modalBack';

// Boîte de dialogue de confirmation générique (overlay centré).
withDefaults(
  defineProps<{
    title: string;
    body?: string;
    confirmLabel: string;
    cancelLabel: string;
    danger?: boolean;
  }>(),
  { body: undefined, danger: false },
);
const emit = defineEmits<{ confirm: []; cancel: [] }>();

// The hardware / browser back button dismisses the dialog (same as cancel).
useModalBack(() => emit('cancel'));
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  z-index: 100;
}
.dialog {
  width: 100%;
  max-width: 320px;
  background: var(--bg-card);
  border-radius: 20px;
  padding: 22px 20px 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.dialog-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 8px;
}
.dialog-body {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  margin-bottom: 20px;
}
.dialog-actions {
  display: flex;
  gap: 10px;
}
.btn-cancel,
.btn-confirm {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
.btn-cancel {
  background: var(--border-subtle);
  color: var(--dark);
}
.btn-confirm {
  background: var(--accent);
  color: var(--dark);
}
.btn-confirm.danger {
  background: #fff0f0;
  color: var(--red);
}
</style>
