<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Room, Participant } from '../types';
import { getCurrentUser, requestPayment } from '../utils/nimiq';
import { updateRoom } from '../utils/storage';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

const props = defineProps<{
  room: Room;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'refresh'): void;
}>();

// État
const currentUser = ref<{ id: string; name: string } | null>(null);
const isLoading = ref<boolean>(true);
const error = ref<string>('');

// Calculs
const room = computed(() => props.room);

/**
 * Récupère l'utilisateur courant
 */
async function loadCurrentUser() {
  try {
    currentUser.value = await getCurrentUser();
  } catch (err) {
    console.error('Erreur lors du chargement de l\'utilisateur:', err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Calcul le montant par personne
 */
const amountPerPerson = computed(() => {
  return room.value.amount / room.value.maxParticipants;
});

/**
 * Vérifie si l'utilisateur courant est le créateur
 */
const isCreator = computed(() => {
  if (!currentUser.value) return false;
  return room.value.creatorId === currentUser.value.id;
});

/**
 * Vérifie si l'utilisateur courant a rejoint la room
 */
const hasJoined = computed(() => {
  if (!currentUser.value) return false;
  return room.value.participants.some(p => p.id === currentUser.value!.id);
});

/**
 * Récupère le participant courant
 */
const currentParticipant = computed(() => {
  if (!currentUser.value) return null;
  return room.value.participants.find(p => p.id === currentUser.value!.id) || null;
});

/**
 * Calcul le montant restant à collecter
 */
const remainingAmount = computed(() => {
  const totalPaid = room.value.participants.reduce(
    (sum, p) => sum + p.amountPaid,
    0
  );
  return room.value.amount - totalPaid;
});

/**
 * Calcul le pourcentage de complétion
 */
const completionPercentage = computed(() => {
  return ((room.value.amount - remainingAmount.value) / room.value.amount) * 100;
});

/**
 * Paie sa part
 */
async function payShare() {
  if (!currentUser.value || !currentParticipant.value) return;

  if (currentParticipant.value.status === 'paid') {
    error.value = 'Vous avez déjà payé votre part!';
    return;
  }

  try {
    // Demander le paiement via le SDK Nimiq
    await requestPayment(
      amountPerPerson.value,
      room.value.creatorId,
      `PayShare: ${room.value.reason}`
    );

    // Mettre à jour le statut du participant (en attente de confirmation réelle)
    const updatedParticipant: Participant = {
      ...currentParticipant.value,
      amountPaid: amountPerPerson.value,
      status: 'paid'
    };

    const updatedParticipants = room.value.participants.map(p =>
      p.id === currentParticipant.value!.id ? updatedParticipant : p
    );

    const updatedRoom: Room = {
      ...room.value,
      participants: updatedParticipants
    };

    updateRoom(updatedRoom);
    emit('refresh');
  } catch (err) {
    error.value = 'Erreur lors du paiement';
    console.error(err);
  }
}

/**
 * Fermer la room (uniquement pour le créateur)
 */
async function closeRoom() {
  if (!isCreator.value) return;

  const updatedRoom: Room = {
    ...room.value,
    status: 'closed'
  };

  updateRoom(updatedRoom);
  emit('refresh');
}

/**
 * Copie l'ID de la room dans le presse-papiers
 */
async function copyRoomId() {
  try {
    await navigator.clipboard.writeText(room.value.id);
    error.value = '';
    // Afficher un message de succès
    const originalError = error.value;
    error.value = 'ID copié dans le presse-papiers!';
    setTimeout(() => {
      error.value = originalError;
    }, 2000);
  } catch (err) {
    error.value = 'Impossible de copier l\'ID';
  }
}

onMounted(() => {
  loadCurrentUser();
});
</script>

<template>
  <div class="room-detail">
    <div v-if="isLoading" class="loading">
      Chargement...
    </div>

    <div v-else class="content">
      <!-- En-tête -->
      <header class="room-header">
        <button @click="emit('back')" class="back-btn">← Retour</button>
        <div class="room-title">
          <h2>{{ room.reason }}</h2>
          <span class="status-badge" :class="room.status">{{ room.status === 'open' ? 'Ouverte' : 'Fermée' }}</span>
        </div>
      </header>

      <!-- Résumé de la room -->
      <div class="room-summary">
        <div class="amount-display">
          <span class="total-amount">{{ room.amount }} {{ room.currency }}</span>
          <span class="amount-label">Montant total</span>
        </div>

        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: completionPercentage + '%' }"
            ></div>
          </div>
          <div class="progress-labels">
            <span>{{ (completionPercentage).toFixed(0) }}% collecté</span>
            <span>{{ remainingAmount.toFixed(2) }} {{ room.currency }} restant</span>
          </div>
        </div>

        <div class="room-meta">
          <p>Créée par: <strong>{{ room.creatorName }}</strong></p>
          <p>Participants: {{ room.participants.length }}/{{ room.maxParticipants }}</p>
          <p>Montant par personne: <strong>{{ amountPerPerson.toFixed(2) }} {{ room.currency }}</strong></p>
        </div>
      </div>

      <!-- QR Code (pour partage) -->
      <div v-if="isCreator" class="qr-section">
        <h3>Partager cette room</h3>
        <div class="qr-and-id">
          <QRCodeGenerator :room-id="room.id" />
          <div class="room-id">
            <p>ID de la room:</p>
            <div class="id-container">
              <code>{{ room.id }}</code>
              <button @click="copyRoomId" class="copy-btn" title="Copier">
                📋
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des participants -->
      <div class="participants-section">
        <h3>Participants</h3>
        <ul class="participants-list">
          <li 
            v-for="participant in room.participants" 
            :key="participant.id"
            class="participant"
            :class="{ 'current-user': currentUser && participant.id === currentUser.id }"
          >
            <div class="participant-info">
              <span class="participant-name">{{ participant.name }}</span>
              <span class="participant-status" :class="participant.status">
                {{ participant.status === 'paid' ? '✓ Payé' : '⏳ En attente' }}
              </span>
            </div>
            <div class="participant-amount">
              {{ participant.amountPaid.toFixed(2) }} {{ room.currency }}
            </div>
          </li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="actions">
        <!-- Action pour le participant -->
        <button 
          v-if="hasJoined && currentParticipant && currentParticipant.status === 'pending'"
          @click="payShare"
          class="btn-primary btn-pay"
        >
          Payer ma part ({{ amountPerPerson.toFixed(2) }} {{ room.currency }})
        </button>

        <!-- Action pour le créateur -->
        <button 
          v-if="isCreator && room.status === 'open'"
          @click="closeRoom"
          class="btn-secondary"
        >
          Fermer la room
        </button>

        <!-- Message si déjà payé -->
        <div 
          v-if="hasJoined && currentParticipant && currentParticipant.status === 'paid'"
          class="success-message"
        >
          ✓ Vous avez payé votre part de {{ amountPerPerson.toFixed(2) }} {{ room.currency }}
        </div>

        <!-- Message si pas encore rejoint -->
        <div v-if="!hasJoined" class="info-message">
          Vous n'avez pas encore rejoint cette room
        </div>

        <!-- Erreur -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-detail {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.room-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 16px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  align-self: flex-start;
}

.back-btn:hover {
  background: var(--accent-bg);
}

.room-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-title h2 {
  color: var(--text-h);
  margin: 0;
  font-size: 24px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.open {
  background: var(--accent-bg);
  color: var(--accent);
}

.status-badge.closed {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
}

.room-summary {
  background: var(--code-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.amount-display {
  text-align: center;
  margin-bottom: 20px;
}

.total-amount {
  font-size: 32px;
  font-weight: bold;
  color: var(--text-h);
}

.amount-label {
  color: var(--text);
  font-size: 14px;
}

.progress-container {
  margin-bottom: 20px;
}

.progress-bar {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-border));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text);
}

.room-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.room-meta p {
  margin: 0;
  color: var(--text);
  font-size: 14px;
}

.qr-section {
  background: var(--code-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.qr-section h3 {
  color: var(--text-h);
  margin-bottom: 16px;
  font-size: 16px;
}

.qr-and-id {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.room-id {
  text-align: center;
}

.room-id p {
  color: var(--text);
  font-size: 14px;
  margin-bottom: 8px;
}

.id-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg);
  padding: 8px 12px;
  border-radius: 8px;
}

.id-container code {
  font-size: 12px;
  word-break: break-all;
  color: var(--text-h);
}

.copy-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 4px;
  font-size: 16px;
}

.copy-btn:hover {
  opacity: 0.7;
}

.participants-section {
  background: var(--code-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.participants-section h3 {
  color: var(--text-h);
  margin-bottom: 16px;
  font-size: 16px;
}

.participants-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.participant {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.participant:last-child {
  border-bottom: none;
}

.participant.current-user {
  background: var(--accent-bg);
  border-radius: 8px;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
}

.participant-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-name {
  color: var(--text-h);
  font-weight: 500;
  font-size: 14px;
}

.participant-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--social-bg);
  color: var(--text);
}

.participant-status.paid {
  background: var(--accent-bg);
  color: var(--accent);
}

.participant-amount {
  color: var(--text);
  font-weight: 500;
  font-size: 14px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 20px;
}

.btn-primary,
.btn-secondary {
  padding: 14px 24px;
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
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-pay {
  font-size: 18px;
  padding: 16px 24px;
}

.success-message,
.info-message,
.error-message {
  padding: 12px 16px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.success-message {
  background: var(--accent-bg);
  color: var(--accent);
}

.info-message {
  background: var(--social-bg);
  color: var(--text);
}

.error-message {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
}

@media (max-width: 600px) {
  .room-title {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .participant {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .participant-info {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }
}
</style>
