<script setup lang="ts">
import { ref } from 'vue';
import type { Room } from '../types';
import { getCurrentUser } from '../utils/nimiq';
import { addRoom, generateRoomId } from '../utils/storage';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

const emit = defineEmits<{
  (e: 'roomCreated', room: Room): void;
}>();

// Formulaire
const amount = ref<number>(0);
const currency = ref<string>('NIM');
const reason = ref<string>('');
const maxParticipants = ref<number>(2);

// État après création
const createdRoom = ref<Room | null>(null);
const isCreating = ref<boolean>(false);
const error = ref<string>('');

// Options de devise
const currencyOptions = ['NIM', 'EUR', 'USD', 'CHF'];

/**
 * Crée une nouvelle room
 */
async function createRoom() {
  error.value = '';
  
  // Validation
  if (!amount.value || amount.value <= 0) {
    error.value = 'Le montant doit être supérieur à 0';
    return;
  }
  
  if (!reason.value.trim()) {
    error.value = 'Veuillez indiquer une raison';
    return;
  }
  
  if (!maxParticipants.value || maxParticipants.value < 2) {
    error.value = 'Il faut au moins 2 participants';
    return;
  }

  isCreating.value = true;

  try {
    // Récupérer l'utilisateur courant
    const currentUser = await getCurrentUser();

    // Créer la room
    const room: Room = {
      id: generateRoomId(),
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      amount: amount.value,
      currency: currency.value,
      reason: reason.value.trim(),
      maxParticipants: maxParticipants.value,
      participants: [{
        id: currentUser.id,
        name: currentUser.name,
        amountPaid: amount.value, // Le créateur a déjà payé sa part
        joinedAt: new Date(),
        status: 'paid' as const
      }],
      createdAt: new Date(),
      status: 'open'
    };

    // Sauvegarder la room
    addRoom(room);
    createdRoom.value = room;

    // Émettre l'événement
    emit('roomCreated', room);
  } catch (err) {
    error.value = 'Erreur lors de la création de la room';
    console.error(err);
  } finally {
    isCreating.value = false;
  }
}

/**
 * Réinitialise le formulaire
 */
function resetForm() {
  amount.value = 0;
  reason.value = '';
  maxParticipants.value = 2;
  error.value = '';
  createdRoom.value = null;
}
</script>

<template>
  <div class="create-room">
    <!-- Formulaire de création -->
    <div v-if="!createdRoom" class="form-container">
      <h2>Créer une Room</h2>
      <p class="subtitle">Remboursez vos frais entre amis</p>

      <form @submit.prevent="createRoom" class="form">
        <div class="form-group">
          <label for="amount">Montant total</label>
          <div class="amount-input">
            <input
              id="amount"
              v-model.number="amount"
              type="number"
              placeholder="0"
              min="0.01"
              step="0.01"
              required
            />
            <select v-model="currency" class="currency-select">
              <option v-for="curr in currencyOptions" :key="curr" :value="curr">
                {{ curr }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="reason">Raison</label>
          <input
            id="reason"
            v-model="reason"
            type="text"
            placeholder="Ex: Pizza du vendredi, Courses, Essence"
            required
          />
        </div>

        <div class="form-group">
          <label for="participants">Nombre de participants</label>
          <input
            id="participants"
            v-model.number="maxParticipants"
            type="number"
            placeholder="2"
            min="2"
            max="20"
            required
          />
          <p class="hint">(Toi + {{ maxParticipants - 1 }} autres)</p>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" :disabled="isCreating" class="btn-primary">
          <span v-if="isCreating">Création en cours...</span>
          <span v-else>Créer la Room</span>
        </button>
      </form>
    </div>

    <!-- Résultat avec QR Code -->
    <div v-else class="result-container">
      <h2>Room créée avec succès !</h2>
      <p class="room-info">
        Montant: <strong>{{ createdRoom.amount }} {{ createdRoom.currency }}</strong> | 
        Raison: <strong>{{ createdRoom.reason }}</strong>
      </p>

      <div class="qr-section">
        <QRCodeGenerator :room-id="createdRoom.id" />
        <p class="qr-hint">Scannez ce QR code pour rejoindre la room</p>
      </div>

      <div class="room-details">
        <p>ID de la room: <code>{{ createdRoom.id }}</code></p>
        <p>Partagez ce code ou le QR code avec vos amis</p>
      </div>

      <div class="actions">
        <button @click="resetForm" class="btn-secondary">Créer une autre room</button>
        <button @click="emit('roomCreated', createdRoom!)" class="btn-primary">
          Voir la room
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-room {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.form-container,
.result-container {
  background: var(--code-bg);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.form-container h2,
.result-container h2 {
  color: var(--text-h);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text);
  margin-bottom: 24px;
  font-size: 14px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: var(--text-h);
  font-size: 14px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent);
}

.amount-input {
  display: flex;
  gap: 8px;
}

.amount-input input {
  flex: 1;
}

.currency-select {
  width: 80px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
}

.hint {
  color: var(--text);
  font-size: 12px;
  margin-top: 4px;
}

.error-message {
  color: #ff4444;
  font-size: 14px;
  padding: 12px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  text-align: center;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-border);
  box-shadow: var(--shadow);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--social-bg);
  color: var(--text-h);
  margin-right: 12px;
}

.btn-secondary:hover {
  background: var(--border);
}

.result-container {
  text-align: center;
}

.room-info {
  color: var(--text);
  margin-bottom: 24px;
}

.qr-section {
  margin: 24px 0;
}

.qr-hint {
  color: var(--text);
  font-size: 14px;
  margin-top: 12px;
}

.room-details {
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.room-details code {
  background: var(--code-bg);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 600px) {
  .amount-input {
    flex-direction: column;
  }
  
  .currency-select {
    width: 100%;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
