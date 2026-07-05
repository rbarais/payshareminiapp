<template>
  <BaseSheet @close="$emit('close')">
    <!-- Step 1: choose the debtor -->
    <template v-if="!inviteDeeplink">
      <div class="sheet-title">{{ t('invite.title') }}</div>
      <div class="sheet-sub">
        {{
          t('invite.sub', { description: expense.description, paidBy: memberName(expense.paidBy) })
        }}
      </div>

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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 3L11 8L6 13"
              stroke="#8B8880"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <div v-else class="sheet-empty">{{ t('invite.noDebtors') }}</div>
    </template>

    <!-- Step 2: QR (in person) + sharing the https link (remote) -->
    <template v-else>
      <div class="sheet-title">{{ t('invite.settleTitle') }}</div>
      <div class="sheet-sub">{{ inviteLabel }}</div>
      <div class="qr-box">
        <QRCodeGenerator :url="inviteDeeplink" :size="200" />
      </div>
      <div class="sheet-note">{{ t('invite.qrNote') }}</div>
      <button class="sheet-copy" @click="shareInvite">{{ t('invite.copyLink') }}</button>
      <button class="sheet-back" @click="backToDebtors">{{ t('invite.back') }}</button>
    </template>
  </BaseSheet>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Expense, Group, ShareableRoom } from '../types';
import { useToast } from '../stores/toast';
import { useI18n } from '../stores/i18n';
import { encodeShareUrl, buildInviteDeeplink } from '../utils/room';
import BaseSheet from './BaseSheet.vue';
import QRCodeGenerator from './QRCodeGenerator.vue';

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
.sheet-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
}
.sheet-sub {
  font-size: 12px;
  color: var(--text);
  margin-top: 2px;
  margin-bottom: 14px;
}

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

.sheet-copy {
  width: 100%;
  margin-top: 14px;
  background: var(--accent);
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}

.sheet-back {
  width: 100%;
  margin-top: 8px;
  background: none;
  border: none;
  padding: 10px;
  font-size: 13px;
  color: var(--text-mid);
  cursor: pointer;
  font-family: inherit;
}
</style>
