<template>
  <!-- QR modal -->
  <div v-if="showQR" class="screen">
    <div class="top-bar">
      <button class="icon-btn" @click="showQR = false">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path
            d="M10.5 4L6 8.5L10.5 13"
            stroke="#1A1916"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span class="bar-title">{{ t('pay.qrTitle') }}</span>
      <div style="width: 36px" />
    </div>
    <div class="qr-center">
      <div class="qr-desc">{{ room?.reason }}</div>
      <div class="qr-amount">{{ perPerson.toFixed(2) }} NIM</div>
      <div class="qr-wrap">
        <QRCodeGenerator :url="shareUrl" :size="220" />
      </div>
      <p class="qr-hint">{{ t('pay.qrHint') }}</p>
    </div>
  </div>

  <!-- Pay screen -->
  <div v-else class="screen">
    <div class="top-bar">
      <button class="icon-btn" @click="goBack">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path
            d="M10.5 4L6 8.5L10.5 13"
            stroke="#1A1916"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span class="bar-title">{{ t('pay.title') }}</span>
      <div style="width: 36px" />
    </div>

    <div class="scroll">
      <!-- Recipient -->
      <div class="recipient-card">
        <InitialAvatar :name="room?.creatorName || 'M'" :size="56" class="recipient-avatar" />
        <div class="recipient-name">{{ room?.creatorName ?? 'Marie' }}</div>
        <div class="recipient-desc">{{ room?.reason ?? '' }}</div>
      </div>

      <!-- Amount -->
      <div class="amount-block">
        <div class="amount-label">{{ t('pay.amountLabel') }}</div>
        <div class="amount-big">
          {{ perPerson.toFixed(2) }} <span class="amount-currency">NIM</span>
        </div>
        <div class="amount-sub">
          {{ t('pay.amountSub', { participants: room?.maxParticipants ?? 0, total: room?.amount?.toFixed(2) ?? '0.00' }) }}
        </div>
      </div>

      <!-- Breakdown -->
      <div v-if="room" class="detail-card">
        <div class="detail-label">{{ t('pay.detailLabel') }}</div>
        <div class="detail-row">
          <span class="detail-item">{{ room.reason }}</span>
          <span class="detail-val">{{ perPerson.toFixed(2) }} NIM</span>
        </div>
        <div class="detail-sep" />
        <div class="detail-row">
          <span class="detail-total">{{ t('pay.total') }}</span>
          <span class="detail-total">{{ perPerson.toFixed(2) }} NIM</span>
        </div>
      </div>

      <!-- Progress (tracking) -->
      <div v-if="trackingAvailable" class="progress-card">
        <div class="progress-head">
          <span class="progress-label">{{ t('pay.progressLabel') }}</span>
          <button class="refresh-btn" :disabled="syncing" @click="loadPayments">
            <span v-if="syncing" class="spin-dot" /> {{ syncing ? t('pay.syncing') : '↻' }}
          </button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <div class="progress-stats">
          <span
            ><strong>{{ collected.toFixed(2) }}</strong> / {{ room?.amount.toFixed(2) }} NIM</span
          >
          <span>{{ t('pay.paidCount', { paid: payersCount, total: room?.maxParticipants ?? 0 }) }}</span>
        </div>
        <p v-if="remaining > 0" class="remaining">{{ t('pay.remaining', { amount: remaining.toFixed(2) }) }}</p>
        <p v-else class="remaining done">{{ t('pay.collected') }}</p>
        <p v-if="loadError" class="load-error">{{ loadError }}</p>
      </div>

      <!-- Creator info -->
      <div v-if="isCreator" class="info-banner">
        {{ t('pay.creatorInfo') }}
      </div>

      <!-- Already paid on chain -->
      <div v-else-if="hasPaidOnChain" class="already-paid">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="8" fill="#198060" />
          <path
            d="M5 8L7 10L11 6"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ t('pay.alreadyPaid') }}
      </div>

      <!-- Security note -->
      <div class="security-note">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path
            d="M6.5 1L2 3V7C2 9.5 4 11.8 6.5 12.5C9 11.8 11 9.5 11 7V3L6.5 1Z"
            stroke="#8B8880"
            stroke-width="1.1"
            fill="none"
          />
          <path
            d="M4.5 6.5L5.8 7.8L8.5 5"
            stroke="#8B8880"
            stroke-width="1.1"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ t('pay.securityNote') }}</span>
      </div>

      <div v-if="session.isNimiqApp.value === false" class="dev-notice">
        {{ t('pay.devNotice') }}
      </div>
    </div>

    <!-- Buttons -->
    <div class="actions">
      <!-- Awaiting on-chain confirmation after payment -->
      <div v-if="awaitingOnChain" class="confirming-banner">
        <span class="spin-dot" />
        <span>{{ t('pay.confirming') }}</span>
      </div>

      <button
        v-else-if="!hasPaidOnChain && !isCreator"
        class="btn-pay"
        :disabled="isPaying"
        @click="pay"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="11" fill="#1A1916" />
          <path d="M6.5 17L11 7L15.5 17H6.5Z" fill="#F6B221" />
        </svg>
        <span>{{ isPaying ? t('pay.processing') : t('pay.payButton', { amount: perPerson.toFixed(2) }) }}</span>
      </button>

      <button class="btn-qr" :disabled="awaitingOnChain" @click="showQR = true">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="#3D3B35" stroke-width="1.4" />
          <rect x="2" y="11" width="5" height="5" rx="1" stroke="#3D3B35" stroke-width="1.4" />
          <rect x="11" y="2" width="5" height="5" rx="1" stroke="#3D3B35" stroke-width="1.4" />
          <rect x="3.5" y="3.5" width="2" height="2" fill="#3D3B35" />
          <rect x="3.5" y="12.5" width="2" height="2" fill="#3D3B35" />
          <rect x="12.5" y="3.5" width="2" height="2" fill="#3D3B35" />
          <path
            d="M11 11H13M15 11V13M11 15H13M15 15V13M15 13H11"
            stroke="#3D3B35"
            stroke-width="1.4"
            stroke-linecap="round"
          />
        </svg>
        <span>{{ t('pay.showQr') }}</span>
      </button>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { ShareableRoom, Settlement } from '../types';
import { getCurrentUser, requestPayment } from '../utils/nimiq';
import { amountPerPerson, paymentData } from '../utils/room';
import { fetchRoomPayments, type RoomPayment } from '../utils/webclient';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';
import InitialAvatar from '../components/InitialAvatar.vue';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';

import { useRouter } from 'vue-router';
import { useI18n } from '../stores/i18n';

const props = defineProps<{ room: ShareableRoom | null; groupId?: string }>();

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const { t } = useI18n();

function goBack() {
  router.back();
}

function handleSuccess(amount: number, recipient: string) {
  router.push({
    name: 'success',
    query: { amount: amount.toString(), recipient },
  });
}

const currentUser = ref<{ id: string; name: string } | null>(null);
const isPaying = ref(false);
const awaitingOnChain = ref(false);
const error = ref('');
const showQR = ref(false);

const payments = ref<RoomPayment[]>([]);
const syncing = ref(false);
const loadError = ref('');

const perPerson = computed(() => (props.room ? amountPerPerson(props.room) : 0));
const isCreator = computed(() => props.room && currentUser.value?.id === props.room.creatorId);
const trackingAvailable = computed(() => !!props.room?.creatorId.startsWith('NQ'));

const norm = (address: string) => address.replace(/\s/g, '').toUpperCase();

const collected = computed(() =>
  payments.value.reduce((sum, payment) => sum + payment.valueNim, 0),
);
const payersCount = computed(() => payments.value.length);
const remaining = computed(() => Math.max(0, (props.room?.amount ?? 0) - collected.value));
const progressPct = computed(() =>
  props.room && props.room.amount > 0
    ? Math.min(100, (collected.value / props.room.amount) * 100)
    : 0,
);

const hasPaidOnChain = computed(() => {
  const me = currentUser.value ? norm(currentUser.value.id) : '';
  return !!me && payments.value.some((payment) => norm(payment.from) === me);
});

const shareUrl = computed(() => {
  if (!props.room) return '';
  const encoded = encodeURIComponent(btoa(JSON.stringify(props.room)));
  return `${window.location.origin}${window.location.pathname}?r=${encoded}`;
});

let pollId: ReturnType<typeof setInterval> | null = null;

async function loadPayments() {
  if (!trackingAvailable.value || !props.room) return;
  syncing.value = true;
  loadError.value = '';
  try {
    payments.value = await fetchRoomPayments(props.room.creatorId, props.room.id);
  } catch {
    loadError.value = t('pay.syncError');
  } finally {
    syncing.value = false;
  }
}

async function pay() {
  if (!props.room) return;
  isPaying.value = true;
  error.value = '';
  try {
    await requestPayment(perPerson.value, props.room.creatorId, paymentData(props.room));

    if (!trackingAvailable.value) {
      // Outside Nimiq Pay or non-NQ address: no on-chain verification possible.
      handleSuccess(perPerson.value, props.room.creatorName);
      return;
    }

    // On-chain available: wait for webclient.ts to confirm the tx before navigating.
    awaitingOnChain.value = true;
    if (pollId !== null) clearInterval(pollId);
    pollId = setInterval(loadPayments, 3000); // aggressive polling while waiting
    loadPayments();

    // Safety net: if confirmation takes too long (slow network), navigate anyway.
    setTimeout(() => {
      if (!awaitingOnChain.value) return;
      awaitingOnChain.value = false;
      handleSuccess(perPerson.value, props.room!.creatorName);
    }, 90_000);
  } catch {
    error.value = t('pay.payError');
  } finally {
    isPaying.value = false;
  }
}

// As soon as webclient.ts detects the on-chain tx: record the settlement (with the
// real blockchain hash) and navigate to SuccessView if we were awaiting confirmation.
watch(hasPaidOnChain, (confirmed) => {
  if (!confirmed || !props.room || !currentUser.value) return;
  const me = norm(currentUser.value.id);
  const myPayment = payments.value.find((payment) => norm(payment.from) === me);
  if (!myPayment) return;

  if (props.groupId) {
    const settlement: Settlement = {
      id: myPayment.hash,
      groupId: props.groupId,
      fromId: currentUser.value.id,
      toId: props.room.creatorId,
      amount: props.room.amount,
      currency: props.room.currency,
      settledAt: new Date(myPayment.timestamp * 1000),
    };
    store.addSettlement(settlement);
  }

  if (awaitingOnChain.value) {
    awaitingOnChain.value = false;
    handleSuccess(perPerson.value, props.room.creatorName);
  }
});

onMounted(async () => {
  // Reuse the already-connected user (avoids re-triggering the native dialog).
  currentUser.value = session.user.value ?? (await getCurrentUser());
  loadPayments();
  if (trackingAvailable.value) {
    pollId = setInterval(loadPayments, 20000);
  }
});

onUnmounted(() => {
  if (pollId !== null) clearInterval(pollId);
});
</script>

<style scoped>
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.top-bar {
  padding: 8px 18px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.bar-title {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Recipient */
.recipient-card {
  background: var(--bg-card);
  border-radius: 18px;
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-md);
}

.recipient-avatar {
  margin: 0 auto 10px;
}

.recipient-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--dark);
  margin-bottom: 3px;
}

.recipient-desc {
  font-size: 12px;
  color: var(--text);
}

/* Amount */
.amount-block {
  text-align: center;
}

.amount-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin-bottom: 8px;
}

.amount-big {
  font-size: 46px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -2px;
  line-height: 1.05;
}

.amount-currency {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0;
}

.amount-sub {
  font-size: 13px;
  color: var(--text);
  margin-top: 4px;
}

/* Breakdown */
.detail-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.detail-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin-bottom: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-item {
  color: var(--text-mid);
}
.detail-val {
  font-weight: 600;
  color: var(--dark);
}
.detail-sep {
  border-top: 1px solid var(--border-subtle);
  margin: 8px 0;
}

.detail-total {
  font-size: 13px;
  font-weight: 700;
  color: var(--dark);
}

/* Progress */
.progress-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text);
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-mid);
  cursor: pointer;
  font-family: inherit;
}

.refresh-btn:disabled {
  opacity: 0.5;
}

.spin-dot {
  width: 8px;
  height: 8px;
  border: 2px solid var(--text);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.progress-bar {
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-mid);
}

.remaining {
  font-size: 12px;
  color: var(--text);
  margin-top: 6px;
}
.remaining.done {
  color: var(--green);
  font-weight: 600;
}
.load-error {
  font-size: 11px;
  color: var(--text);
  font-style: italic;
  margin-top: 6px;
}

.info-banner {
  background: var(--accent-dim);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 13px;
  color: var(--dark);
  text-align: center;
}

.already-paid {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
  padding: 10px 0;
}

.security-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 0;
}

.security-note span {
  font-size: 10.5px;
  color: var(--text);
}

.dev-notice {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  font-style: italic;
  padding-bottom: 4px;
}

/* Buttons */
.actions {
  padding: 0 18px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.btn-pay {
  background: var(--accent);
  border: none;
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  transition: opacity 0.15s;
}

.btn-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-pay:hover:not(:disabled) {
  opacity: 0.9;
}

.confirming-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--accent-dim);
  border-radius: 16px;
  padding: 16px 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dark);
}

.btn-qr {
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 13px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #3d3b35;
  font-family: inherit;
  width: 100%;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-qr:hover {
  background: var(--border-subtle);
}

.error-msg {
  font-size: 13px;
  color: var(--red);
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 12px;
  padding: 10px 14px;
  text-align: center;
}

/* QR view */
.qr-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 18px 40px;
  gap: 8px;
}

.qr-desc {
  font-size: 18px;
  font-weight: 700;
  color: var(--dark);
}
.qr-amount {
  font-size: 32px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -1px;
}

.qr-wrap {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-md);
  margin: 12px 0 4px;
}

.qr-hint {
  font-size: 13px;
  color: var(--text);
}
</style>
