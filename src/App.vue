<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ShareableRoom } from './types';
import { decodeRoomFromUrl, decodeRoomFromText } from './utils/room';
import CreateRoom from './views/CreateRoom.vue';
import PayRoom from './views/PayRoom.vue';
import QRScanner from './components/QRScanner.vue';

type View = 'home' | 'create' | 'pay' | 'scan';

const view = ref<View>('home');
const incomingRoom = ref<ShareableRoom | null>(null);
const scanError = ref('');

onMounted(() => {
  const room = decodeRoomFromUrl();
  if (room) {
    incomingRoom.value = room;
    view.value = 'pay';
  }
});

function handleScanned(text: string) {
  scanError.value = '';
  const room = decodeRoomFromText(text);
  if (room) {
    incomingRoom.value = room;
    view.value = 'pay';
  } else {
    scanError.value = 'QR non reconnu — assure-toi de scanner un QR PayShare';
    view.value = 'home';
  }
}
</script>

<template>
  <!-- Scanner plein écran -->
  <QRScanner
    v-if="view === 'scan'"
    @scanned="handleScanned"
    @cancel="view = 'home'"
  />

  <div class="app" v-else>
    <!-- Vue paiement (ouverture via QR) -->
    <PayRoom
      v-if="view === 'pay' && incomingRoom"
      :room="incomingRoom"
      @back="view = 'home'"
    />

    <!-- Vue création -->
    <CreateRoom
      v-else-if="view === 'create'"
      @back="view = 'home'"
    />

    <!-- Accueil -->
    <div v-else class="home">
      <div class="hero">
        <h1 class="app-name">PayShare</h1>
        <p class="tagline">Partagez vos frais, payez en NIM</p>
      </div>

      <div class="actions">
        <button class="btn-create" @click="view = 'create'">
          Nouvelle dépense
        </button>
        <button class="btn-scan" @click="view = 'scan'">
          Scanner un QR
        </button>
      </div>

      <p v-if="scanError" class="scan-error">{{ scanError }}</p>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

.home {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 40px 20px;
  text-align: center;
}

.hero {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-name {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -2px;
  background: linear-gradient(135deg, var(--accent), #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.tagline {
  font-size: 16px;
  color: var(--text);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 320px;
}

.btn-create {
  padding: 18px;
  border: none;
  border-radius: 16px;
  background: var(--accent);
  color: white;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(170, 59, 255, 0.35);
  transition: opacity 0.2s, transform 0.1s;
}

.btn-create:hover {
  opacity: 0.92;
  transform: translateY(-2px);
}

.btn-scan {
  padding: 16px;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  background: var(--code-bg);
  color: var(--text-h);
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-scan::before {
  content: '⬚';
  font-size: 20px;
}

.btn-scan:hover {
  border-color: var(--accent);
  background: var(--accent-bg);
  color: var(--accent);
}

.scan-error {
  font-size: 14px;
  color: #ef4444;
  max-width: 280px;
}
</style>
