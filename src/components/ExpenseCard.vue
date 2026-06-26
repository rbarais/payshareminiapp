<script setup lang="ts">
import { computed } from 'vue';
import type { Expense } from '../types';

// Carte d'une dépense dans un groupe. Le clic ouvre l'invitation à payer ;
// le crayon émet `edit`. Les valeurs dérivées (part, payeur) sont fournies
// par le parent qui connaît le contexte du groupe et l'utilisateur courant.
const props = defineProps<{
  expense: Expense;
  userShare: number;
  paidByName: string;
  isMine: boolean;
}>();
defineEmits<{ select: []; edit: [] }>();

const dateLabel = computed(() =>
  props.expense.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
);

const fillPct = computed(() =>
  Math.min(100, (props.userShare / props.expense.amount) * 100),
);
</script>

<template>
  <div class="expense-card" @click="$emit('select')">
    <div class="expense-top">
      <div class="expense-left">
        <div class="expense-title">{{ expense.description }}</div>
        <div class="expense-meta">Payé par {{ paidByName }} · {{ dateLabel }}</div>
      </div>
      <button class="exp-edit-btn" @click.stop="$emit('edit')" aria-label="Modifier la dépense">
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <path d="M2 13L5 10M9 2L13 6L6.5 12.5L2.5 12.5L2.5 8.5L9 2Z" stroke="#8B8880" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="expense-right">
        <div class="expense-total">{{ expense.amount.toFixed(2) }} {{ expense.currency }}</div>
        <div class="expense-share" :style="{ color: isMine ? '#198060' : '#CC3C3C' }">
          {{ isMine ? 'tu as payé' : `−${userShare.toFixed(2)} ${expense.currency}` }}
        </div>
      </div>
    </div>
    <div class="bar-bg">
      <div
        class="bar-fill"
        :style="{ width: fillPct + '%', background: isMine ? '#198060' : '#F6B221' }"
      />
    </div>
  </div>
</template>

<style scoped>
.expense-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 13px 15px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.12s;
}

.expense-card:active { transform: scale(0.99); }

.expense-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 9px;
}

.expense-left { flex: 1; min-width: 0; }
.expense-title { font-size: 13px; font-weight: 600; color: var(--dark); }
.expense-meta { font-size: 11px; color: var(--text); margin-top: 2px; }

.exp-edit-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -2px 4px 0;
  cursor: pointer;
  transition: opacity 0.15s;
}

.exp-edit-btn:active { opacity: 0.6; }

.expense-right { text-align: right; flex-shrink: 0; margin-left: 8px; }
.expense-total { font-size: 13px; font-weight: 600; color: var(--dark); }
.expense-share { font-size: 10px; margin-top: 1px; }

.bar-bg { height: 3px; background: var(--border-subtle); border-radius: 2px; }
.bar-fill { height: 100%; border-radius: 2px; }
</style>
