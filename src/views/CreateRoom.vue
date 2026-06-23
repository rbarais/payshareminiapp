<script setup lang="ts">
import { ref } from 'vue';
import type { Room } from '../types';
import { getCurrentUser } from '../utils/nimiq';
import { addRoom, generateRoomId } from '../utils/storage';
import { encodeRoomToUrl } from '../utils/room';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const reason = ref('');
const amount = ref<number | null>(null);
const maxParticipants = ref(2);
const isCreating = ref(false);
const error = ref('');

const createdRoom = ref<Room | null>(null);
const shareUrl = ref('');

async function createRoom() {
  error.value = '';

  if (!reason.value.trim()) {
    error.value = 'Indique la raison';
    return;
  }
  if (!amount.value || amount.value <= 0) {
    error.value = 'Le montant doit être supérieur à 0';
    return;
  }
  if (maxParticipants.value < 2) {
    error.value = 'Il faut au moins 2 participants';
    return;
  }

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
      participants: [{
        id: user.id,
        name: user.name,
        amountPaid: amount.value / maxParticipants.value,
        joinedAt: new Date(),
        status: 'paid',
      }],
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
  <div class="create-room">
    <button class="back-btn" @click="emit('back')">← Retour</button>

    <!-- Formulaire -->
    <div v-if="!createdRoom" class="card">
      <h2>Nouvelle dépense</h2>
      <p class="subtitle">Tes amis paieront leur part en scannant le QR</p>

      <form @submit.prevent="createRoom" class="form">
        <div class="field">
          <label>Pour quoi ?</label>
          <input v-model="reason" type="text" placeholder="Pizza du vendredi, Essence…" required />
        </div>

        <div class="field">
          <label>Montant total (NIM)</label>
          <input v-model.number="amount" type="number" placeholder="0" min="0.01" step="0.01" required />
        </div>

        <div class="field">
          <label>Nombre de personnes</label>
          <div class="stepper">
            <button type="button" @click="maxParticipants = Math.max(2, maxParticipants - 1)">−</button>
            <span>{{ maxParticipants }}</span>
            <button type="button" @click="maxParticipants = Math.min(20, maxParticipants + 1)">+</button>
          </div>
          <p class="hint" v-if="amount && amount > 0">
            {{ (amount / maxParticipants).toFixed(2) }} NIM par personne
          </p>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="isCreating">
          {{ isCreating ? 'Création…' : 'Générer le QR code' }}
        </button>
      </form>
    </div>

    <!-- QR code de partage -->
    <div v-else class="card result">
      <h2>{{ createdRoom.reason }}</h2>
      <p class="amount-label">
        {{ (createdRoom.amount / createdRoom.maxParticipants).toFixed(2) }} NIM / personne
        <span class="muted">· {{ createdRoom.maxParticipants }} personnes</span>
      </p>

      <div class="qr-section">
        <QRCodeGenerator :url="shareUrl" :size="240" />
        <p class="qr-hint">Fais scanner ce QR à tes amis</p>
      </div>

      <button class="btn-secondary" @click="copyUrl">Copier le lien</button>
      <button class="btn-ghost" @click="createdRoom = null; shareUrl = ''">Créer une autre</button>
    </div>
  </div>
</template>

<style scoped>
.create-room {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  max-width: 440px;
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

.card {
  background: var(--code-bg);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
}

h2 {
  color: var(--text-h);
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text);
  font-size: 14px;
  margin-bottom: 24px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field input {
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 16px;
  transition: border-color 0.2s;
}

.field input:focus {
  outline: none;
  border-color: var(--accent);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg);
}

.stepper button {
  background: none;
  border: none;
  padding: 12px 20px;
  font-size: 20px;
  cursor: pointer;
  color: var(--accent);
  transition: background 0.15s;
}

.stepper button:hover {
  background: var(--accent-bg);
}

.stepper span {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
}

.hint {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
}

.error {
  color: #ef4444;
  font-size: 14px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 8px;
}

.btn-primary {
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

/* Résultat */
.result {
  text-align: center;
}

.amount-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
  margin-bottom: 28px;
}

.muted {
  font-weight: 400;
  color: var(--text);
  font-size: 15px;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.qr-hint {
  font-size: 14px;
  color: var(--text);
}

.btn-secondary {
  display: block;
  width: 100%;
  padding: 13px;
  border: 1.5px solid var(--accent);
  border-radius: 12px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 10px;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: rgba(170, 59, 255, 0.15);
}

.btn-ghost {
  display: block;
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: none;
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
}

.btn-ghost:hover {
  background: var(--social-bg);
}
</style>
