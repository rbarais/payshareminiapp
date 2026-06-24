<script setup lang="ts">
import { ref } from 'vue';
import type { Room } from '../types';
import { getCurrentUser } from '../utils/nimiq';
import { addRoom, generateRoomId } from '../utils/storage';
import { encodeRoomToUrl } from '../utils/room';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

import { useRouter } from 'vue-router';

const router = useRouter()

function goBack() {
  router.back()
}

const reason = ref('');
const amount = ref<number | null>(null);
const maxParticipants = ref(2);
const isCreating = ref(false);
const error = ref('');
const createdRoom = ref<Room | null>(null);
const shareUrl = ref('');

async function createRoom() {
  error.value = '';
  if (!reason.value.trim()) { error.value = 'Indique la raison'; return; }
  if (!amount.value || amount.value <= 0) { error.value = 'Le montant doit être > 0'; return; }
  if (maxParticipants.value < 2) { error.value = 'Il faut au moins 2 participants'; return; }

  isCreating.value = true;
  try {
    const user = await getCurrentUser();
    const room: Room = {
      id: generateRoomId(),
      creatorId: user.id,
      creatorName: user.name,
      amount: amount.value,
      currency: 'NIM',
      reason: reason.value.trim(),
      maxParticipants: maxParticipants.value,
      participants: [{ id: user.id, name: user.name, amountPaid: amount.value / maxParticipants.value, joinedAt: new Date(), status: 'paid' }],
      createdAt: new Date(),
      status: 'open',
    };
    addRoom(room);
    createdRoom.value = room;
    shareUrl.value = encodeRoomToUrl(room);
  } catch {
    error.value = 'Erreur lors de la création';
  } finally {
    isCreating.value = false;
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(shareUrl.value);
}
</script>

<template>
  <!-- QR Result -->
  <div v-if="createdRoom" class="screen">
    <div class="top-bar">
      <button class="icon-btn" @click="createdRoom = null; shareUrl = ''">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path d="M10.5 4L6 8.5L10.5 13" stroke="#1A1916" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="top-title">QR Code de partage</span>
      <div style="width:36px"/>
    </div>

    <div class="qr-result">
      <div class="expense-label">{{ createdRoom.reason }}</div>
      <div class="per-person">{{ (createdRoom.amount / createdRoom.maxParticipants).toFixed(2) }} NIM <span class="per-label">/ personne</span></div>
      <div class="total-info">{{ createdRoom.amount.toFixed(2) }} NIM total · {{ createdRoom.maxParticipants }} personnes</div>

      <div class="qr-wrap">
        <QRCodeGenerator :url="shareUrl" :size="220" />
      </div>
      <p class="qr-hint">Fais scanner ce QR à tes amis</p>

      <button class="btn-primary" @click="copyUrl">Copier le lien</button>
      <button class="btn-ghost" @click="createdRoom = null; shareUrl = ''">Créer une autre dépense</button>
    </div>
  </div>

  <!-- Create Form -->
  <div v-else class="screen">
    <!-- Top bar -->
    <div class="top-bar">
      <button class="icon-btn" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="#3D3B35" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="top-title">Nouvelle dépense</span>
      <button class="icon-btn accent" @click="createRoom" :disabled="isCreating">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7L5.5 10.5L12 3" stroke="#1A1916" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Big amount -->
    <div class="amount-section">
      <div class="amount-display">{{ amount ? amount.toFixed(2) : '0.00' }}</div>
      <div class="currency-tabs">
        <div class="currency-tab active">NIM</div>
        <div class="currency-tab">ETH</div>
        <div class="currency-tab">USDT</div>
        <div class="currency-tab">EUR</div>
      </div>
    </div>

    <!-- Form -->
    <div class="form-area">
      <div class="field-card">
        <div class="field-label">Description</div>
        <input
          class="field-input"
          v-model="reason"
          type="text"
          placeholder="Pizza du vendredi, Essence…"
        />
      </div>

      <div class="field-card row">
        <div>
          <div class="field-label">Montant total</div>
          <input
            class="field-input inline"
            v-model.number="amount"
            type="number"
            placeholder="0"
            min="0.01"
            step="0.01"
          />
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 7L8 10L11 7" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div class="field-card">
        <div class="field-label">Répartir entre · Équitable</div>
        <div class="stepper-row">
          <button class="stepper-btn" type="button" @click="maxParticipants = Math.max(2, maxParticipants - 1)">−</button>
          <span class="stepper-val">{{ maxParticipants }} personnes</span>
          <button class="stepper-btn" type="button" @click="maxParticipants = Math.min(20, maxParticipants + 1)">+</button>
        </div>
        <div v-if="amount && amount > 0" class="split-info">
          Part de chacun · <strong>{{ (amount / maxParticipants).toFixed(2) }} NIM</strong>
        </div>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" @click="createRoom" :disabled="isCreating">
        {{ isCreating ? 'Création…' : 'Ajouter la dépense' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

/* Top bar */
.top-bar {
  padding: 10px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.top-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dark);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--border);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-btn.accent {
  background: var(--accent);
}

.icon-btn:disabled {
  opacity: 0.5;
}

/* Amount section */
.amount-section {
  padding: 4px 18px 18px;
  text-align: center;
  flex-shrink: 0;
}

.amount-display {
  font-size: 56px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -3px;
  line-height: 1.05;
}

.currency-tabs {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
}

.currency-tab {
  background: var(--border);
  color: var(--text-mid);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.15s;
}

.currency-tab.active {
  background: var(--dark);
  color: var(--accent);
}

/* Form */
.form-area {
  flex: 1;
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
}

.field-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.field-card.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin-bottom: 5px;
}

.field-input {
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--dark);
  background: transparent;
  width: 100%;
  padding: 0;
}

.field-input::placeholder {
  color: var(--border);
}

.field-input.inline {
  width: auto;
}

.stepper-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
}

.stepper-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--border);
  border: none;
  font-size: 18px;
  color: var(--dark);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.stepper-val {
  font-size: 14px;
  font-weight: 500;
  color: var(--dark);
}

.split-info {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-mid);
}

.split-info strong {
  color: var(--dark);
}

.error-msg {
  font-size: 13px;
  color: var(--red);
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 12px;
  padding: 10px 14px;
}

/* CTA */
.cta-area {
  padding: 14px 18px 28px;
  flex-shrink: 0;
}

.btn-primary {
  display: block;
  width: 100%;
  background: var(--accent);
  border: none;
  border-radius: 16px;
  padding: 17px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
  transition: opacity 0.15s;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 13px;
  font-size: 14px;
  color: var(--text-mid);
  margin-top: 8px;
}

/* QR Result */
.qr-result {
  flex: 1;
  padding: 0 18px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.expense-label {
  font-size: 20px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
  text-align: center;
}

.per-person {
  font-size: 28px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -1px;
}

.per-label {
  font-size: 16px;
  font-weight: 400;
  color: var(--text);
}

.total-info {
  font-size: 12px;
  color: var(--text);
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
  margin-bottom: 16px;
}
</style>
