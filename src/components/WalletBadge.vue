<script setup lang="ts">
import { ref } from 'vue';
import NimiqIdenticon from './NimiqIdenticon.vue';

// Wallet badge (address + connected status) with a disconnect menu.
// The full profile will come in Phase 6bis; here, a minimal version.
defineProps<{ address: string }>();
const emit = defineEmits<{ disconnect: [] }>();

const showMenu = ref(false);

function disconnect() {
  showMenu.value = false;
  emit('disconnect');
}
</script>

<template>
  <div class="wallet-badge" @click="showMenu = !showMenu">
    <div class="wallet-info">
      <div class="wallet-addr">{{ address }}</div>
      <div class="wallet-status">
        <span class="status-dot" />
        <span class="status-text">Connecté</span>
      </div>
    </div>
    <div class="identicon">
      <NimiqIdenticon :size="38" />
      <div class="connected-dot">
        <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
          <path
            d="M1 2.5L2.3 3.8L5 1"
            stroke="white"
            stroke-width="1.1"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </div>

  <!-- Wallet menu (disconnect) -->
  <div v-if="showMenu" class="menu-overlay" @click="showMenu = false">
    <div class="wallet-menu" @click.stop>
      <div class="menu-addr">{{ address }}</div>
      <button class="menu-item danger" @click="disconnect">Se déconnecter</button>
    </div>
  </div>
</template>

<style scoped>
.wallet-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.wallet-info {
  text-align: right;
}

.wallet-addr {
  font-size: 9px;
  color: var(--text);
  font-family: monospace;
  letter-spacing: 0.02em;
}

.wallet-status {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-end;
  margin-top: 2px;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
  display: inline-block;
}

.status-text {
  font-size: 9px;
  color: var(--green);
  font-weight: 600;
}

.identicon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
}

.connected-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--green);
  border: 1.5px solid var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Menu */
.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
}

.wallet-menu {
  position: absolute;
  top: 56px;
  right: 18px;
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
  padding: 8px;
  min-width: 170px;
}

.menu-addr {
  font-size: 10px;
  color: var(--text);
  font-family: monospace;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.menu-item {
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}

.menu-item:hover {
  background: var(--border-subtle);
}
.menu-item.danger {
  color: var(--red);
}
</style>
