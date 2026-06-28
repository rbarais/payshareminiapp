<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div v-for="t in toast.toasts.value" :key="t.id" class="toast" :class="t.type">
        {{ t.message }}
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '../stores/toast';

const toast = useToast();
</script>

<style scoped>
.toast-host {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 88px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  padding: 0 18px;
}

.toast {
  max-width: 360px;
  width: 100%;
  background: var(--dark);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  padding: 13px 16px;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  text-align: center;
}

.toast.error {
  background: var(--red);
}
.toast.success {
  background: var(--green);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
</style>
