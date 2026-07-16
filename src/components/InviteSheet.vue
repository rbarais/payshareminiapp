<template>
  <BaseSheet :title="sheetTitle" :subtitle="sheetSub" @close="$emit('close')">
    <!-- Step 1: choose the debtor -->
    <template v-if="!inviteDeeplink">
      <div v-if="debtorsOf(expense).length" class="debtor-list">
        <button
          v-for="share in debtorsOf(expense)"
          :key="share.memberId"
          class="debtor-row"
          @click="selectDebtor(share.memberId, share.amount)"
        >
          <div class="debtor-info">
            <div class="debtor-name">{{ memberName(share.memberId) }}</div>
            <div class="debtor-amount">{{ share.amount.toFixed(2) }} {{ expense.currency }}</div>
          </div>
          <ChevronRightIcon class="chevron" />
        </button>
      </div>
      <div v-else class="sheet-empty">{{ t('invite.noDebtors') }}</div>
    </template>

    <!-- Step 2: QR (in person) + sharing the https link (remote) -->
    <template v-else>
      <div class="qr-box">
        <QRCodeGenerator :url="inviteDeeplink" :size="200" />
      </div>
      <div class="sheet-note">{{ t('invite.qrNote') }}</div>
      <button class="btn-primary" @click="shareInvite">{{ t('invite.copyLink') }}</button>
      <button class="btn-ghost" @click="backToDebtors">{{ t('invite.back') }}</button>
    </template>
  </BaseSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Expense, Group, ShareableRoom } from '../types';
import { useToast } from '../stores/toast';
import { useI18n } from '../stores/i18n';
import { encodeShareUrl, buildInviteDeeplink } from '../utils/room';
import BaseSheet from './BaseSheet.vue';
import QRCodeGenerator from './QRCodeGenerator.vue';
import ChevronRightIcon from '../assets/svg/chevronRight.svg';

// Invitation to pay one's share (backend-free version): pick a debtor, then
// generate a QR (nimiqpay:// deeplink resolved by the camera, reliable in
// person) + a clickable https URL to share remotely.
const props = defineProps<{ expense: Expense; group: Group; userId: string }>();
defineEmits<{ close: [] }>();

const toast = useToast();
const { t } = useI18n();

const inviteHttps = ref(''); // clickable https URL (to share)
const inviteDeeplink = ref(''); // nimiqpay:// deeplink (encoded in the QR)
const inviteLabel = ref('');

// Sheet header depending on the step (debtor choice vs QR/link).
const sheetTitle = computed(() =>
  inviteDeeplink.value ? t('invite.settleTitle') : t('invite.title'),
);
const sheetSub = computed(() =>
  inviteDeeplink.value
    ? inviteLabel.value
    : t('invite.sub', {
        description: props.expense.description,
        paidBy: memberName(props.expense.paidBy),
      }),
);

function memberName(id: string): string {
  const member = props.group.members.find((member) => member.id === id);
  const norm = (address: string) => address.replace(/\s/g, '').toUpperCase();
  if (member?.address && norm(member.address) === norm(props.userId)) {
    return t('group.you');
  }
  return member?.name ?? t('group.unknown');
}

// Members who owe their share for this expense (excluding the payer).
function debtorsOf(expense: Expense) {
  return expense.shares.filter(
    (share) => share.memberId !== expense.paidBy && share.amount > 0.005,
  );
}

function backToDebtors() {
  inviteHttps.value = '';
  inviteDeeplink.value = '';
  inviteLabel.value = '';
}

// Build the https URL (share) + the deeplink (QR) to settle the share.
function selectDebtor(memberId: string, shareAmount: number) {
  const expense = props.expense;
  const payee = props.group.members.find((member) => member.id === expense.paidBy);
  if (!payee || !payee.address?.startsWith('NQ')) {
    toast.show(t('invite.toastNoAddress'), 'error');
    return;
  }
  if (expense.currency !== 'NIM') {
    toast.show(t('invite.toastNimOnly'), 'error');
    return;
  }
  const payload: ShareableRoom = {
    id: expense.id,
    creatorId: payee.address,
    creatorName: payee.name,
    amount: shareAmount,
    currency: expense.currency,
    reason: expense.description,
    maxParticipants: 1,
  };
  inviteHttps.value = encodeShareUrl(payload);
  inviteDeeplink.value = buildInviteDeeplink(inviteHttps.value);
  inviteLabel.value = `${memberName(memberId)} · ${shareAmount.toFixed(2)} NIM`;
}

// The Nimiq Pay WebView does not expose the Web Share API → we copy the link.
// If navigator.share exists (mobile browser), we use it.
async function shareInvite() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'PayShare',
        text: t('invite.shareText', { description: props.expense.description }),
        url: inviteHttps.value,
      });
    } catch {
      /* share cancelled */
    }
    return;
  }
  if (!navigator.clipboard?.writeText) {
    toast.show(t('invite.toastCopyUnavailable'), 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(inviteHttps.value);
    toast.show(t('invite.toastCopied'), 'success');
  } catch {
    toast.show(t('invite.toastCopyFailed'), 'error');
  }
}
</script>

<style scoped>
.debtor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debtor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg);
  border: none;
  border-radius: 14px;
  padding: 12px 14px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.debtor-row:active {
  opacity: 0.7;
}

.debtor-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dark);
}
.chevron {
  color: var(--text);
  flex-shrink: 0;
}
.debtor-amount {
  font-size: 12px;
  color: var(--text);
  margin-top: 1px;
}

.sheet-empty {
  font-size: 13px;
  color: var(--text);
  padding: 12px 0;
  text-align: center;
}

.sheet-note {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  margin-top: 14px;
  line-height: 1.5;
}

.qr-box {
  display: flex;
  justify-content: center;
  margin: 16px 0 4px;
}
</style>
