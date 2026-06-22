<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Room } from './types';
import { getCurrentUser, isNimiqEnvironment } from './utils/nimiq';
import { getRooms, getRoomById } from './utils/storage';
import CreateRoom from './views/CreateRoom.vue';
import JoinRoom from './views/JoinRoom.vue';
import RoomDetail from './views/RoomDetail.vue';

// État de l'application
type ViewType = 'home' | 'create' | 'join' | 'room';

const currentView = ref<ViewType>('home');
const currentRoom = ref<Room | null>(null);
const rooms = ref<Room[]>([]);
const currentUser = ref<{ id: string; name: string } | null>(null);
const isLoading = ref<boolean>(true);
const error = ref<string>('');

/**
 * Charge les données initiales
 */
async function loadInitialData() {
  try {
    // Vérifier si on est dans un environnement Nimiq
    if (isNimiqEnvironment()) {
      currentUser.value = await getCurrentUser();
    } else {
      // Mode dev: utiliser un utilisateur fictif
      currentUser.value = {
        id: 'dev_user_' + Math.random().toString(36).substr(2, 9),
        name: 'Dev User'
      };
      console.warn('Mode développement: utilisateur fictif');
    }

    // Charger les rooms
    rooms.value = getRooms();
  } catch (err) {
    console.error('Erreur lors du chargement initial:', err);
    error.value = 'Impossible de charger les données';
  } finally {
    isLoading.value = false;
  }
}

/**
 * Navigue vers une vue
 */
function navigateTo(view: ViewType, room?: Room) {
  currentView.value = view;
  if (room) {
    currentRoom.value = room;
  }
}

/**
 * Gère la création d'une room
 */
function handleRoomCreated(room: Room) {
  rooms.value = getRooms(); // Rafraîchir la liste
  currentRoom.value = room;
  currentView.value = 'room';
}

/**
 * Gère la rejoindre d'une room
 */
function handleRoomJoined(room: Room) {
  rooms.value = getRooms(); // Rafraîchir la liste
  currentRoom.value = room;
  currentView.value = 'room';
}

/**
 * Retour à l'accueil
 */
function goHome() {
  currentView.value = 'home';
  currentRoom.value = null;
}

/**
 * Rafraîchit les données
 */
function refresh() {
  rooms.value = getRooms();
  if (currentRoom.value) {
    const updatedRoom = getRoomById(currentRoom.value.id);
    if (updatedRoom) {
      currentRoom.value = updatedRoom;
    }
  }
}

onMounted(() => {
  loadInitialData();
});
</script>

<template>
  <div class="app">
    <!-- En-tête -->
    <header class="app-header">
      <h1>PayShare</h1>
      <p class="subtitle">Partagez vos frais facilement</p>
      
      <div v-if="currentUser" class="user-info">
        <span class="user-name">{{ currentUser.name }}</span>
        <span class="user-id" v-if="currentUser.id">{{ currentUser.id.slice(0, 6) }}...</span>
      </div>
    </header>

    <!-- Message d'erreur global -->
    <div v-if="error" class="global-error">
      {{ error }}
      <button @click="error = ''" class="close-error">×</button>
    </div>

    <!-- Chargement -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Chargement...</p>
    </div>

    <!-- Contenu principal -->
    <main v-else class="main-content">
      <!-- Vue d'accueil -->
      <div v-if="currentView === 'home'" class="home-view">
        <div class="welcome">
          <p>Bienvenue sur PayShare !</p>
          <p>Créez ou rejoignez une room pour partager vos frais entre amis.</p>
        </div>

        <div class="actions">
          <button @click="navigateTo('create')" class="btn-primary btn-large">
            ✚ Créer une Room
          </button>
          <button @click="navigateTo('join')" class="btn-secondary btn-large">
            🔍 Rejoindre une Room
          </button>
        </div>

        <!-- Liste des rooms existantes (si disponible) -->
        <div v-if="rooms.length > 0" class="recent-rooms">
          <h3>Vos rooms récentes</h3>
          <ul class="rooms-list">
            <li 
              v-for="room in rooms" 
              :key="room.id"
              @click="navigateTo('room', room)"
              class="room-item"
            >
              <div class="room-info">
                <span class="room-reason">{{ room.reason }}</span>
                <span class="room-amount">{{ room.amount }} {{ room.currency }}</span>
              </div>
              <div class="room-status">
                <span class="participants-count">
                  {{ room.participants.length }}/{{ room.maxParticipants }}
                </span>
                <span class="status" :class="room.status">
                  {{ room.status === 'open' ? 'Ouverte' : 'Fermée' }}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Vue de création -->
      <CreateRoom 
        v-else-if="currentView === 'create'"
        @room-created="handleRoomCreated"
      />

      <!-- Vue de rejoindre -->
      <JoinRoom 
        v-else-if="currentView === 'join'"
        @room-joined="handleRoomJoined"
      />

      <!-- Vue de détail d'une room -->
      <RoomDetail 
        v-else-if="currentView === 'room' && currentRoom"
        :room="currentRoom"
        @back="goHome"
        @refresh="refresh"
      />
    </main>

    <!-- Pied de page -->
    <footer class="app-footer">
      <p>Powered by Nimiq Mini-Apps</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 100%;
  margin: 0 auto;
}

.app-header {
  text-align: center;
  padding: 24px 20px;
  background: linear-gradient(135deg, var(--accent), var(--accent-border));
  color: white;
  border-radius: 0 0 20px 20px;
  box-shadow: var(--shadow);
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: white;
}

.subtitle {
  margin: 8px 0 16px;
  font-size: 14px;
  opacity: 0.9;
}

.user-info {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
}

.user-name {
  font-weight: 500;
}

.user-id {
  font-size: 12px;
  opacity: 0.8;
}

.main-content {
  flex: 1;
  padding: 24px 20px;
  max-width: 100%;
  box-sizing: border-box;
}

.global-error {
  padding: 12px 20px;
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
  border-radius: 8px;
  margin: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-error {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.home-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome {
  text-align: center;
  color: var(--text);
}

.welcome p {
  margin: 8px 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-primary,
.btn-secondary {
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  background: var(--accent-border);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(170, 59, 255, 0.3);
}

.btn-secondary {
  background: var(--code-bg);
  color: var(--text-h);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--social-bg);
  border-color: var(--accent);
}

.btn-large {
  font-size: 18px;
  padding: 20px 24px;
}

.recent-rooms {
  background: var(--code-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.recent-rooms h3 {
  color: var(--text-h);
  margin-bottom: 16px;
  font-size: 16px;
}

.rooms-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.room-item:hover {
  background: var(--social-bg);
}

.room-item:last-child {
  border-bottom: none;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-reason {
  color: var(--text-h);
  font-weight: 500;
  font-size: 14px;
}

.room-amount {
  color: var(--text);
  font-size: 12px;
}

.room-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.participants-count {
  color: var(--text);
  font-size: 12px;
}

.status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.status.open {
  background: var(--accent-bg);
  color: var(--accent);
}

.status.closed {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: var(--text);
  font-size: 12px;
  border-top: 1px solid var(--border);
}

/* Responsive */
@media (max-width: 600px) {
  .app-header {
    padding: 20px;
  }

  .app-header h1 {
    font-size: 24px;
  }

  .main-content {
    padding: 16px;
  }

  .actions {
    gap: 12px;
  }

  .room-item {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .room-info {
    flex-direction: row;
    gap: 12px;
    align-items: center;
  }

  .room-status {
    flex-direction: row;
    gap: 12px;
    align-items: center;
  }
}
</style>
