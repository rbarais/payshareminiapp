<template>
  <div
    class="expense-card"
    :class="{ 'not-clickable': !clickable }"
    @click="clickable && $emit('select')"
  >
    <div class="expense-top">
      <div class="expense-left">
        <div class="expense-title">{{ expense.description }}</div>
        <div class="expense-meta">
          {{ t('group.paidByMeta') }} {{ paidByName }} · {{ dateLabel }}
        </div>
      </div>
      <button
        class="exp-edit-btn"
        :aria-label="t('group.editExpenseAriaLabel')"
        @click.stop="$emit('edit')"
      >
        <PencilIcon />
      </button>
      <div class="expense-right">
        <div class="expense-total">{{ expense.amount.toFixed(2) }} {{ expense.currency }}</div>
        <div class="expense-share" :class="isMine || settled ? 'ok' : 'due'">
          {{
            isMine
              ? t('group.youPaid')
              : settled
                ? t('group.expenseSettled')
                : `−${userShare.toFixed(2)} ${expense.currency}`
          }}
        </div>
        <div v-if="settled && txHash" class="expense-proof">#{{ txHash.slice(0, 8) }}…</div>
      </div>
    </div>
    <div class="bar-bg">
      <div class="bar-fill" :class="{ ok: isMine || settled }" :style="{ width: fillPct + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Expense } from '../types';
import { useI18n } from '../stores/i18n';
import PencilIcon from '../assets/svg/pencil.svg';

// Card for an expense within a group. Clicking opens the pay invitation;
// the pencil emits `edit`. Derived values (share, payer) are provided by the
// parent, which knows the group context and the current user. `clickable` is
// false once there is nothing left to do on the card (my share fully settled).
const props = withDefaults(
  defineProps<{
    expense: Expense;
    userShare: number;
    progress?: number; // settlement progress shown by the bar, 0..1
    paidByName: string;
    isMine: boolean;
    settled?: boolean;
    txHash?: string | null;
    clickable?: boolean;
  }>(),
  { clickable: true, progress: 0 },
);
defineEmits<{ select: []; edit: [] }>();

const { t, locale } = useI18n();

const dateLabel = computed(() =>
  props.expense.createdAt.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
  }),
);

// The bar shows the real settlement progress (0..1) computed by the parent:
// for a debtor, how much of their share is paid; for the payer, how much of
// the expense has been reimbursed to them.
const fillPct = computed(() => Math.max(0, Math.min(100, props.progress * 100)));
</script>

<style scoped>
.expense-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 13px 15px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.12s;
}

.expense-card:active {
  transform: scale(0.99);
}

.expense-card.not-clickable {
  cursor: default;
}

.expense-card.not-clickable:active {
  transform: none;
}

.expense-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 9px;
}

.expense-left {
  flex: 1;
  min-width: 0;
}
.expense-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
}
.expense-meta {
  font-size: 11px;
  color: var(--text);
  margin-top: 2px;
}

.exp-edit-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -2px 4px 0;
  cursor: pointer;
  transition: opacity 0.15s;
}

.exp-edit-btn:active {
  opacity: 0.6;
}

.expense-right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 8px;
}
.expense-total {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
}
.expense-share {
  font-size: 10px;
  margin-top: 1px;
}
.expense-share.ok {
  color: var(--green);
}
.expense-share.due {
  color: var(--red);
}

.bar-bg {
  height: 3px;
  background: var(--border-subtle);
  border-radius: 2px;
}
.bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
}
.bar-fill.ok {
  background: var(--green);
}

.expense-proof {
  font-size: 9px;
  color: var(--text);
  margin-top: 1px;
  font-family: monospace;
}
</style>
