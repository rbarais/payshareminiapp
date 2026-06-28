<template>
  <div class="wallet-badge" @click="emit('open')">
    <div class="wallet-info">
      <div class="wallet-addr">{{ address }}</div>
      <div class="wallet-status">
        <span class="status-dot" />
        <span class="status-text">{{ t('settings.connected') }}</span>
      </div>
    </div>
    <div class="identicon">
      <NimiqIdenticon :address="address" :size="38" />
      <div class="connected-dot">
        <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
          <path
            d="M1 2.5L2.3 3.8L5 1"
            stroke="white"
            stroke-width="1.1"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NimiqIdenticon from './NimiqIdenticon.vue';
import { useI18n } from '../stores/i18n';

defineProps<{ address: string }>();
const emit = defineEmits<{ open: [] }>();
const { t } = useI18n();
</script>

<style scoped>
.wallet-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.wallet-info {
  text-align: right;
}

.wallet-addr {
  font-size: 9px;
  color: var(--text);
  font-family: monospace;
  letter-spacing: 0.02em;
}

.wallet-status {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-end;
  margin-top: 2px;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  display: inline-block;
}

.status-text {
  font-size: 9px;
  color: var(--green);
  font-weight: 600;
}

.identicon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
}

.connected-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--green);
  border: 1.5px solid var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
