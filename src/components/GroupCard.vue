<script setup lang="ts">
import { computed } from 'vue';
import type { Group } from '../types';
import { GROUP_ICON_STYLE, balanceView } from '../utils/groupUi';

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
      <svg v-if="group.icon === 'person'" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 18C4 15 7.13 12.5 11 12.5C14.87 12.5 18 15 18 18" :stroke="iconStyle.color" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="11" cy="8" r="3.5" :stroke="iconStyle.color" stroke-width="1.5"/>
      </svg>
      <svg v-else-if="group.icon === 'home'" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z" :stroke="iconStyle.color" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
      <svg v-else-if="group.icon === 'car'" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="6.5" cy="15.5" r="2.5" :stroke="iconStyle.color" stroke-width="1.5"/>
        <circle cx="15.5" cy="15.5" r="2.5" :stroke="iconStyle.color" stroke-width="1.5"/>
        <path d="M2 15.5H4M9 15.5H13M18 15.5H20M4 15.5V9L7 5H15L18 9V15.5" :stroke="iconStyle.color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 6H18M4 11H18M4 16H12" :stroke="iconStyle.color" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
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
