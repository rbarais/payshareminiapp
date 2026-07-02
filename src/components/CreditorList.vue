<template>
  <div class="creditor-list">
    <div v-for="debt in debts" :key="debt.creditor.id" class="creditor">
      <div class="creditor-head">
        <InitialAvatar :name="debt.creditor.name" :size="34" />
        <div class="creditor-info">
          <div class="creditor-name">{{ debt.creditor.name }}</div>
          <div class="creditor-amount">{{ debt.remaining.toFixed(2) }} NIM</div>
        </div>
        <button v-if="canSettle(debt)" class="settle-btn" @click="payAll(debt)">
          {{ t('settle.payAll') }}
        </button>
        <span v-else class="settle-disabled">{{ t('settle.needsConnect') }}</span>
      </div>

      <div class="expense-detail">
        <div
          v-for="item in debt.expenses"
          :key="item.expense.id"
          class="detail-row"
          :class="{ settled: item.settled }"
        >
          <span class="detail-desc">{{ item.expense.description }}</span>
          <span v-if="item.settled" class="detail-settled">{{
            t('settle.perExpenseSettled')
          }}</span>
          <span v-else class="detail-share">{{ item.open.toFixed(2) }} NIM</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { Group, ShareableRoom } from '../types';
import type { CreditorDebt } from '../stores/groups';
import { buildAllocations } from '../utils/allocations';
import InitialAvatar from './InitialAvatar.vue';
import { useI18n } from '../stores/i18n';

// Per-creditor cards shown at the top of GroupView: one "pay everything"
// payment per creditor, with the per-expense breakdown underneath.
const props = defineProps<{ group: Group; debts: CreditorDebt[] }>();

const router = useRouter();
const { t } = useI18n();

// A creditor is payable on-chain if they linked a Nimiq address (not a placeholder).
function canSettle(debt: CreditorDebt): boolean {
  return !!debt.creditor.address?.startsWith('NQ');
}

function payAll(debt: CreditorDebt) {
  if (!canSettle(debt)) return;

  const openItems = debt.expenses
    .filter((item) => !item.settled)
    .map((item) => ({ expenseId: item.expense.id, open: item.open }));

  const room: ShareableRoom = {
    id: `settle_${props.group.id}_${debt.creditor.id.slice(-8)}`,
    creatorId: debt.creditor.address!,
    creatorName: debt.creditor.name,
    amount: debt.remaining,
    currency: 'NIM',
    reason: t('settle.reason', { groupName: props.group.name }),
    maxParticipants: 1,
    allocations: buildAllocations(openItems, debt.remaining),
  };

  router.push({
    name: 'pay',
    query: { room: encodeURIComponent(JSON.stringify(room)), groupId: props.group.id },
  });
}
</script>

<style scoped>
.creditor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.creditor {
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 16px;
  padding: 12px 14px;
}

.creditor-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.creditor-info {
  flex: 1;
  min-width: 0;
}
.creditor-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
}
.creditor-amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--red);
  letter-spacing: -0.3px;
  margin-top: 1px;
}

.settle-btn {
  background: var(--red);
  border: none;
  border-radius: 12px;
  padding: 9px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.settle-btn:hover {
  opacity: 0.85;
}

.settle-disabled {
  font-size: 10px;
  color: var(--text);
  text-align: right;
  flex-shrink: 0;
  max-width: 80px;
  line-height: 1.3;
}

.expense-detail {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--red-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-row.settled {
  opacity: 0.55;
}

.detail-desc {
  color: var(--text-mid);
}
.detail-share {
  color: var(--dark);
  font-weight: 500;
}
.detail-settled {
  color: var(--green);
  font-weight: 600;
}
</style>
