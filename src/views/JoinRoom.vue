<script setup lang="ts">
import { ref } from 'vue';
import type { Room, Participant } from '../types';
import { getCurrentUser } from '../utils/nimiq';
import { getRoomById, updateRoom } from '../utils/storage';

const emit = defineEmits<{
  (e: 'roomJoined', room: Room): void;
}>();

// État du scan QR
const roomId = ref<string>('');
const error = ref<string>('');
const isJoining = ref<boolean>(false);
const roomFound = ref<Room | null>(null);

// Pour le lecteur QR (si disponible)
const useCamera = ref<boolean>(false);
const cameraError = ref<string>('');

/**
 * Recherche une room par son ID
 */
async function findRoom() {
  error.value = '';
  
  if (!roomId.value.trim()) {
    error.value = 'Veuillez entrer un ID de room';
    return;
  }

  const room = getRoomById(roomId.value.trim());
  
  if (!room) {
    error.value = 'Room non trouvée. Vérifiez l\'ID.';
    roomFound.value = null;
    return;
  }

  roomFound.value = room;
  roomId.value = room.id;
}

/**
 * Rejoint une room
 */
async function joinRoom() {
  if (!roomFound.value) return;

  isJoining.value = true;
  error.value = '';

  try {
    const currentUser = await getCurrentUser();

    // Vérifier si l'utilisateur n'est pas déjà dans la room
    const alreadyJoined = roomFound.value.participants.some(
      p => p.id === currentUser.id
    );

    if (alreadyJoined) {
      error.value = 'Vous avez déjà rejoint cette room!';
      isJoining.value = false;
      // Rediriger vers la room directement
      emit('roomJoined', roomFound.value);
      return;
    }

    // Vérifier si la room est pleine
    if (roomFound.value.participants.length >= roomFound.value.maxParticipants) {
      error.value = 'Cette room est déjà pleine!';
      isJoining.value = false;
      return;
    }

    // Ajouter le participant
    const newParticipant: Participant = {
      id: currentUser.id,
      name: currentUser.name,
      amountPaid: 0,
      joinedAt: new Date(),
      status: 'pending'
    };

    const updatedRoom: Room = {
      ...roomFound.value,
      participants: [...roomFound.value.participants, newParticipant]
    };

    // Mettre à jour la room
    updateRoom(updatedRoom);
    
    // Émettre l'événement
    emit('roomJoined', updatedRoom);
  } catch (err) {
    error.value = 'Erreur lors de la rejoindre de la room';
    console.error(err);
  } finally {
    isJoining.value = false;
  }
}

/**
 * Active/désactive la caméra
 */
function toggleCamera() {
  useCamera.value = !useCamera.value;
  if (useCamera.value) {
    cameraError.value = '';
  }
}
</script>

<template>
  <div class="join-room">
    <h2>Rejoindre une Room</h2>
    <p class="subtitle">Scannez un QR code ou entrez l'ID de la room</p>

    <!-- Affichage si room trouvée -->
    <div v-if="roomFound" class="room-found">
      <h3>Room trouvée: {{ roomFound.reason }}</h3>
      <div class="room-summary">
        <p>
          <strong>Montant:</strong> {{ roomFound.amount }} {{ roomFound.currency }}
        </p>
        <p>
          <strong>Créée par:</strong> {{ roomFound.creatorName }}
        </p>
        <p>
          <strong>Participants:</strong> 
          {{ roomFound.participants.length }}/{{ roomFound.maxParticipants }}
        </p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button 
        @click="joinRoom" 
        :disabled="isJoining"
        class="btn-primary"
      >
        <span v-if="isJoining">Rejoint en cours...</span>
        <span v-else>Rejoindre cette Room</span>
      </button>
      
      <button @click="roomFound = null" class="btn-secondary">
        Chercher une autre room
      </button>
    </div>

    <!-- Formulaire de recherche -->
    <div v-else class="search-form">
      <div class="form-group">
        <label for="roomId">ID de la Room</label>
        <div class="input-with-camera">
          <input
            id="roomId"
            v-model="roomId"
            type="text"
            placeholder="Ex: room_1718989898_xyz123"
            @keyup.enter="findRoom"
          />
          <button 
            @click="toggleCamera"
            class="camera-btn"
            :class="{ active: useCamera }"
          >
            📷
          </button>
        </div>
      </div>

      <!-- Lecteur QR (si activé) -->
      <div v-if="useCamera" class="qr-reader-container">
        <div v-if="cameraError" class="error-message">
          {{ cameraError }}
        </div>
        <div v-else class="qr-reader-placeholder">
          <p>Caméra activée - Scannez un QR code</p>
          <!-- En production, utiliser une lib comme @zxing/library -->
          <p class="hint">(Fonctionnalité caméra à implémenter avec @zxing/library)</p>
        </div>
      </div>

      <div v-if="error && !roomFound" class="error-message">
        {{ error }}
      </div>

      <button @click="findRoom" :disabled="!roomId.trim()" class="btn-primary">
        Rechercher la Room
      </button>
    </div>
  </div>
</template>

<style scoped>
.join-room {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.join-room h2 {
  color: var(--text-h);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text);
  margin-bottom: 24px;
  font-size: 14px;
}

.search-form,
.room-found {
  background: var(--code-bg);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group label {
  color: var(--text-h);
  font-size: 14px;
  font-weight: 500;
}

.input-with-camera {
  display: flex;
  gap: 8px;
}

.input-with-camera input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 16px;
}

.camera-btn {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.camera-btn:hover {
  background: var(--social-bg);
}

.camera-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
}

.qr-reader-container {
  margin: 20px 0;
  padding: 20px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  background: var(--bg);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.qr-reader-placeholder {
  color: var(--text);
}

.qr-reader-placeholder p {
  margin: 8px 0;
}

.hint {
  font-size: 12px;
  color: var(--text);
  font-style: italic;
}

.room-found {
  text-align: center;
}

.room-found h3 {
  color: var(--text-h);
  margin-bottom: 16px;
}

.room-summary {
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.room-summary p {
  margin: 8px 0;
  color: var(--text);
}

.error-message {
  color: #ff4444;
  font-size: 14px;
  padding: 12px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
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
  width: 100%;
  margin-bottom: 12px;
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
</style>
