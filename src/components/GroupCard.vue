<script setup lang="ts">
import { computed } from 'vue';
import type { Group } from '../types';
import { GROUP_ICON_STYLE, balanceView } from '../utils/groupUi';
import GroupIcon from './GroupIcon.vue';

const props = defineProps<{
  group: Group;
  expenseCount: number;
  balance: number;
}>();

const iconStyle = computed(() => GROUP_ICON_STYLE[props.group.icon]);
const bal = computed(() => balanceView(props.balance));
</script>

<template>
  <button class="group-card">
    <div class="group-icon" :style="{ background: iconStyle.bg }">
      <GroupIcon :type="group.icon" :color="iconStyle.color" />
    </div>
    <div class="group-info">
      <div class="group-name">{{ group.name }}</div>
      <div class="group-meta">{{ group.members.length }} membres · {{ expenseCount }} dépenses</div>
    </div>
    <div class="group-balance">
      <div class="group-amount" :style="{ color: bal.color }">{{ bal.amount }}</div>
      <div v-if="bal.label" class="group-label">{{ bal.label }}</div>
    </div>
  </button>
</template>

<style scoped>
.group-card {
  background: var(--bg-card);
  border: none;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s, box-shadow 0.12s;
  width: 100%;
}

.group-card:hover { transform: scale(0.99); }
.group-card:active { transform: scale(0.97); }

.group-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.group-info { flex: 1; min-width: 0; }

.group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
  margin-bottom: 2px;
}

.group-meta { font-size: 11px; color: var(--text); }

.group-balance { text-align: right; flex-shrink: 0; }

.group-amount { font-size: 13px; font-weight: 600; }

.group-label { font-size: 10px; color: var(--text); margin-top: 1px; }
</style>
