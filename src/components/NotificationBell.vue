<template>
  <button class="bell" :aria-label="t('notifications.title')" @click="$emit('click')">
    <BellIcon width="18" height="18" />
    <span v-if="unread" class="dot" />
  </button>
</template>

<script setup lang="ts">
import BellIcon from '../assets/svg/bell.svg';
import { useI18n } from '../stores/i18n';

defineProps<{ unread: boolean }>();
defineEmits<{ click: [] }>();
const { t } = useI18n();
</script>

<style scoped>
.bell {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bg-card);
  color: var(--dark);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  border: 1.5px solid var(--bg-card);
}
</style>
