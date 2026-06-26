<script setup lang="ts">
import { ref } from 'vue';

// Carte « solde global » : ce qu'on te doit vs ce que tu dois, agrégé.
// Le toggle NIM/EUR est présent mais le taux de change réel arrive en Phase 6.
defineProps<{ credited: number; owed: number }>();

const showEur = ref(false);
</script>

<template>
  <div class="balance-card">
    <div class="balance-top">
      <div class="balance-title">Solde global</div>
      <button class="toggle-btn" @click="showEur = !showEur">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 3.5H9M1 6.5H9M3 1L1 3.5L3 6M7 9L9 6.5L7 4" stroke="rgba(0,0,0,0.5)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ showEur ? 'NIM' : 'EUR' }}</span>
      </button>
    </div>
    <div class="balance-row">
      <div>
        <div class="balance-label">On te doit</div>
        <div class="balance-amount">{{ showEur ? 'Bientôt' : '+' + credited.toFixed(1) + ' NIM' }}</div>
      </div>
      <div class="balance-right">
        <div class="balance-label">Tu dois</div>
        <div class="balance-amount">{{ showEur ? 'Bientôt' : '−' + owed.toFixed(1) + ' NIM' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.balance-card {
  background: var(--accent);
  border-radius: 20px;
  padding: 18px 20px;
  flex-shrink: 0;
}

.balance-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.balance-title {
  font-size: 10px;
  font-weight: 700;
  color: rgba(0,0,0,0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.toggle-btn {
  background: rgba(0,0,0,0.12);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 10px;
  font-weight: 700;
  color: rgba(0,0,0,0.5);
}

.toggle-btn:hover { background: rgba(0,0,0,0.18); }

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.balance-right { text-align: right; }

.balance-label {
  font-size: 10px;
  color: rgba(0,0,0,0.45);
  margin-bottom: 3px;
}

.balance-amount {
  font-size: 21px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.5px;
}
</style>
