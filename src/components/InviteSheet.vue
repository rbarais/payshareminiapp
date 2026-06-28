<script setup lang="ts">
import { ref } from 'vue';
import type { Expense, Group, ShareableRoom } from '../types';
import { useToast } from '../stores/toast';
import { encodeShareUrl, buildInviteDeeplink } from '../utils/room';
import BaseSheet from './BaseSheet.vue';
import QRCodeGenerator from './QRCodeGenerator.vue';

// Invitation to pay one's share (backend-free version): pick a debtor, then
// generate a QR (nimiqpay:// deeplink resolved by the camera, reliable in
// person) + a clickable https URL to share remotely.
const props = defineProps<{ expense: Expense; group: Group; userId: string }>();
defineEmits<{ close: [] }>();

const toast = useToast();

const inviteHttps = ref(''); // clickable https URL (to share)
const inviteDeeplink = ref(''); // nimiqpay:// deeplink (encoded in the QR)
const inviteLabel = ref('');

function memberName(id: string): string {
  if (id === props.userId) return 'toi';
  return props.group.members.find((member) => member.id === id)?.name ?? 'Inconnu';
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
    toast.show('Le payeur doit avoir une adresse Nimiq pour être remboursé', 'error');
    return;
  }
  if (expense.currency !== 'NIM') {
    toast.show("Lien de paiement disponible en NIM pour l'instant", 'error');
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
        text: `Règle ta part « ${props.expense.description} » sur PayShare`,
        url: inviteHttps.value,
      });
    } catch {
      /* share cancelled */
    }
    return;
  }
  if (!navigator.clipboard?.writeText) {
    toast.show('Copie indisponible (contexte non sécurisé)', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(inviteHttps.value);
    toast.show('Lien copié — colle-le dans ta messagerie', 'success');
  } catch {
    toast.show('Impossible de copier le lien', 'error');
  }
}
</script>

<template>
  <BaseSheet @close="$emit('close')">
    <!-- Step 1: choose the debtor -->
    <template v-if="!inviteDeeplink">
      <div class="sheet-title">Inviter à payer</div>
      <div class="sheet-sub">
        {{ expense.description }} · payé par {{ memberName(expense.paidBy) }}
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
      <div v-else class="sheet-empty">Personne ne doit de part sur cette dépense.</div>
    </template>

    <!-- Step 2: QR (in person) + sharing the https link (remote) -->
    <template v-else>
      <div class="sheet-title">Régler la part</div>
      <div class="sheet-sub">{{ inviteLabel }}</div>
      <div class="qr-box">
        <QRCodeGenerator :url="inviteDeeplink" :size="200" />
      </div>
      <div class="sheet-note">
        En présentiel : fais scanner ce QR avec l'appareil photo → Nimiq Pay s'ouvre sur la part à
        régler.
      </div>
      <button class="sheet-copy" @click="shareInvite">Copier le lien</button>
      <button class="sheet-back" @click="backToDebtors">← Choisir un autre membre</button>
    </template>
  </BaseSheet>
</template>

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
