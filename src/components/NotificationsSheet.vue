<template>
  <BaseSheet :title="t('notifications.title')" @close="$emit('close')">
    <div v-if="items.length" class="list">
      <button
        v-for="item in items"
        :key="item.id"
        class="row"
        @click="$emit('select', item.groupId)"
      >
        <div class="row-text">{{ message(item) }}</div>
        <div class="row-time">{{ formatTime(item.date) }}</div>
      </button>
    </div>
    <EmptyState v-else :title="t('notifications.empty')">
      <BellIcon width="30" height="30" />
    </EmptyState>
  </BaseSheet>
</template>

<script setup lang="ts">
import type { NotificationItem } from '../utils/notifications';
import BaseSheet from './BaseSheet.vue';
import EmptyState from './EmptyState.vue';
import BellIcon from '../assets/svg/bell.svg';
import { useI18n } from '../stores/i18n';

defineProps<{ items: NotificationItem[] }>();
defineEmits<{ close: []; select: [groupId: string] }>();
const { t, locale } = useI18n();

function amountText(item: NotificationItem): string {
  if (item.amount === undefined || item.currency === undefined) return '';
  return `${item.amount.toFixed(2)} ${item.currency}`;
}

function message(item: NotificationItem): string {
  if (item.kind === 'received') {
    return t('notifications.received', { name: item.counterpartyName, amount: amountText(item) });
  }
  if (item.kind === 'expenseShare') {
    return t('notifications.expenseShare', {
      name: item.counterpartyName,
      amount: amountText(item),
      group: item.groupName,
    });
  }
  if (item.kind === 'memberJoined') {
    return t('notifications.memberJoined', { name: item.counterpartyName, group: item.groupName });
  }
  return t('notifications.groupSettled', { group: item.groupName });
}

function formatTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return t('history.justNow');
  if (diffMin < 60) return t('history.minutesAgo', { n: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('notifications.hoursAgo', { n: diffHour });
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(date);
}
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  width: 100%;
  text-align: left;
  background: var(--bg-card);
  border: none;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  font-family: inherit;
}

.row-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
  line-height: 1.35;
}

.row-time {
  font-size: 11px;
  color: var(--text);
  opacity: 0.8;
}
</style>
