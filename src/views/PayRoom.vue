<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { ShareableRoom } from '../types';
import { getCurrentUser, requestPayment, isNimiqEnvironment } from '../utils/nimiq';
import { amountPerPerson } from '../utils/room';

const props = defineProps<{
  room: ShareableRoom;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const currentUser = ref<{ id: string; name: string } | null>(null);
const isPaying = ref(false);
const paid = ref(false);
const txHash = ref('');
const error = ref('');

const perPerson = computed(() => amountPerPerson(props.room));
const isCreator = computed(() => currentUser.value?.id === props.room.creatorId);

onMounted(async () => {
  currentUser.value = await getCurrentUser();
});

async function pay() {
  isPaying.value = true;
  error.value = '';
  try {
    const hash = await requestPayment(
      perPerson.value,
      props.room.creatorId,
      `PayShare: ${props.room.reason}`,
    );
    txHash.value = typeof hash === 'string' ? hash : '';
    paid.value = true;
  } catch {
    error.value = 'Paiement annulé ou échoué';
  } finally {
    isPaying.value = false;
  }
}
</script>

<template>
  <div class="pay-room">
    <button class="back-btn" @click="emit('back')">← Retour</button>

    <!-- En-tête de la dépense -->
    <div class="expense-card">
      <p class="label">Dépense partagée</p>
      <h1 class="reason">{{ room.reason }}</h1>
      <p class="creator">par {{ room.creatorName }}</p>
    </div>

    <!-- Montant dû -->
    <div class="amount-card">
      <p class="amount-label">Ta part</p>
      <p class="amount">{{ perPerson.toFixed(2) }} <span class="currency">NIM</span></p>
      <p class="total-hint">
        {{ room.amount.toFixed(2) }} NIM total · {{ room.maxParticipants }} personnes
      </p>
    </div>

    <!-- Statut : déjà payé -->
    <div v-if="paid" class="success-card">
      <p class="success-icon">✓</p>
      <p class="success-title">Paiement envoyé !</p>
      <p class="success-sub">{{ perPerson.toFixed(2) }} NIM envoyés à {{ room.creatorName }}</p>
      <code v-if="txHash" class="tx-hash">{{ txHash.slice(0, 16) }}…</code>
    </div>

    <!-- Statut : créateur -->
    <div v-else-if="isCreator" class="info-card">
      C'est ta dépense — partage le QR code à tes amis pour qu'ils puissent payer.
    </div>

    <!-- Bouton de paiement -->
    <div v-else class="actions">
      <button
        class="btn-pay"
        :disabled="isPaying"
        @click="pay"
      >
        <span v-if="isPaying">Paiement en cours…</span>
        <span v-else>Payer {{ perPerson.toFixed(2) }} NIM</span>
      </button>

      <p v-if="!isNimiqEnvironment()" class="dev-notice">
        Mode développement — le vrai paiement se fait dans Nimiq Pay
      </p>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.pay-room {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  max-width: 400px;
  margin: 0 auto;
}

.back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 15px;
  cursor: pointer;
  align-self: flex-start;
  padding: 4px 0;
}

.expense-card {
  text-align: center;
  padding: 28px 20px 20px;
  background: linear-gradient(135deg, var(--accent), var(--accent-border));
  border-radius: 20px;
  color: white;
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.reason {
  font-size: 26px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.creator {
  font-size: 14px;
  opacity: 0.85;
}

.amount-card {
  text-align: center;
  padding: 28px 20px;
  background: var(--code-bg);
  border-radius: 20px;
  box-shadow: var(--shadow);
}

.amount-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text);
  margin-bottom: 8px;
}

.amount {
  font-size: 48px;
  font-weight: 800;
  color: var(--text-h);
  line-height: 1;
  margin-bottom: 8px;
  letter-spacing: -2px;
}

.currency {
  font-size: 24px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0;
}

.total-hint {
  font-size: 13px;
  color: var(--text);
}

.success-card {
  text-align: center;
  padding: 28px;
  background: var(--accent-bg);
  border: 1.5px solid var(--accent-border);
  border-radius: 20px;
}

.success-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 6px;
}

.success-sub {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 12px;
}

.tx-hash {
  font-size: 12px;
  display: block;
  color: var(--text);
  background: var(--bg);
  padding: 6px 10px;
  border-radius: 6px;
  word-break: break-all;
}

.info-card {
  padding: 20px;
  background: var(--social-bg);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  font-size: 15px;
  color: var(--text);
  text-align: center;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-pay {
  padding: 18px;
  border: none;
  border-radius: 16px;
  background: var(--accent);
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  box-shadow: 0 4px 16px rgba(170, 59, 255, 0.35);
}

.btn-pay:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-pay:active:not(:disabled) {
  transform: translateY(0);
}

.btn-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dev-notice {
  font-size: 12px;
  color: var(--text);
  text-align: center;
  font-style: italic;
}

.error {
  color: #ef4444;
  font-size: 14px;
  text-align: center;
  padding: 10px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 10px;
}
</style>
