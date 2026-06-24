<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';

const router = useRouter()
const session = useSession()

const showEur = ref(false);
const showMenu = ref(false);

function disconnect() {
  showMenu.value = false;
  session.disconnect();
  router.replace({ name: 'home' });
}

function goToNewGroup() {
  router.push({ name: 'newGroup' })
}

function goToGroup() {
  router.push({ name: 'group' })
}

function goToScanner() {
  router.push({ name: 'scan' })
}

const groups = [
  {
    id: 1,
    name: 'Vacances Barcelone',
    members: 4,
    expenses: 8,
    iconBg: '#FFF1CF',
    icon: 'person',
    iconColor: '#B07808',
    amount: '-42.5 NIM',
    amountColor: '#CC3C3C',
    label: 'tu dois',
  },
  {
    id: 2,
    name: 'Appart commun',
    members: 3,
    expenses: 12,
    iconBg: '#E0F5EE',
    icon: 'home',
    iconColor: '#198060',
    amount: '+82.0 NIM',
    amountColor: '#198060',
    label: 'on te doit',
  },
  {
    id: 3,
    name: 'Road Trip Est',
    members: 5,
    expenses: 3,
    iconBg: '#EAEEFF',
    icon: 'car',
    iconColor: '#3844B0',
    amount: 'Soldé ✓',
    amountColor: '#8B8880',
    label: '',
  },
];

const creditedNim = '+124.5 NIM';
const creditedEur = '+8.05 EUR';
const owedNim = '−67.2 NIM';
const owedEur = '−4.60 EUR';
</script>

<template>
  <div class="screen">
    <!-- Header -->
    <div class="header">
      <div class="logo">PayShare</div>
      <div class="wallet-badge" @click="showMenu = !showMenu">
        <div class="wallet-info">
          <div class="wallet-addr">{{ session.walletShort.value }}</div>
          <div class="wallet-status">
            <span class="status-dot" />
            <span class="status-text">Connecté</span>
          </div>
        </div>
        <div class="identicon">
          <svg width="38" height="38" viewBox="0 0 38 38">
            <rect width="38" height="38" fill="#5F4B8B"/>
            <polygon points="0,0 19,19 38,0" fill="#7B6BA5"/>
            <polygon points="38,0 19,19 38,38" fill="#4E3D7A"/>
            <polygon points="38,38 19,19 0,38" fill="#6B5A98"/>
            <polygon points="0,38 19,19 0,0" fill="#533F85"/>
            <circle cx="19" cy="19" r="6" fill="#F6B221"/>
            <polygon points="15.5,23.5 19,12.5 22.5,23.5" fill="#5F4B8B"/>
          </svg>
          <div class="connected-dot">
            <svg width="6" height="5" viewBox="0 0 6 5" fill="none"><path d="M1 2.5L2.3 3.8L5 1" stroke="white" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Menu wallet (déconnexion) — version minimale, Profil complet en Phase 6bis -->
    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false">
      <div class="wallet-menu" @click.stop>
        <div class="menu-addr">{{ session.walletShort.value }}</div>
        <button class="menu-item danger" @click="disconnect">Se déconnecter</button>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Balance card -->
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
            <div class="balance-amount">{{ showEur ? creditedEur : creditedNim }}</div>
            <div class="balance-sub">{{ showEur ? creditedNim : creditedEur }}</div>
          </div>
          <div class="balance-right">
            <div class="balance-label">Tu dois</div>
            <div class="balance-amount">{{ showEur ? owedEur : owedNim }}</div>
            <div class="balance-sub">{{ showEur ? owedNim : owedEur }}</div>
          </div>
        </div>
      </div>

      <!-- Groups header -->
      <div class="section-row">
        <span class="section-title">Mes groupes</span>
        <button class="new-btn" @click="goToNewGroup">
          <span class="new-plus">+</span>
          <span>Nouveau</span>
        </button>
      </div>

      <!-- Group list -->
      <div class="group-list">
        <button
          v-for="g in groups"
          :key="g.id"
          class="group-card"
          @click="goToGroup"
        >
          <div class="group-icon" :style="{ background: g.iconBg }">
            <!-- person -->
            <svg v-if="g.icon === 'person'" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 18C4 15 7.13 12.5 11 12.5C14.87 12.5 18 15 18 18" :stroke="g.iconColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="11" cy="8" r="3.5" :stroke="g.iconColor" stroke-width="1.5"/>
            </svg>
            <!-- home -->
            <svg v-else-if="g.icon === 'home'" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z" :stroke="g.iconColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <!-- car -->
            <svg v-else width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="6.5" cy="15.5" r="2.5" :stroke="g.iconColor" stroke-width="1.5"/>
              <circle cx="15.5" cy="15.5" r="2.5" :stroke="g.iconColor" stroke-width="1.5"/>
              <path d="M2 15.5H4M9 15.5H13M18 15.5H20M4 15.5V9L7 5H15L18 9V15.5" :stroke="g.iconColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="group-info">
            <div class="group-name">{{ g.name }}</div>
            <div class="group-meta">{{ g.members }} membres · {{ g.expenses }} dépenses</div>
          </div>
          <div class="group-balance">
            <div class="group-amount" :style="{ color: g.amountColor }">{{ g.amount }}</div>
            <div v-if="g.label" class="group-label">{{ g.label }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Bottom nav -->
    <nav class="bottom-nav">
      <div class="nav-item active">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z" fill="#F6B221"/>
        </svg>
        <span>Accueil</span>
      </div>
      <div class="nav-item">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="8" cy="8.5" r="3" stroke="#A09890" stroke-width="1.5"/>
          <circle cx="15" cy="8.5" r="3" stroke="#A09890" stroke-width="1.5"/>
          <path d="M2 19C2 16.24 4.69 14 8 14C11.31 14 14 16.24 14 19" stroke="#A09890" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M15 14C18.31 14 21 16.24 21 19" stroke="#A09890" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Groupes</span>
      </div>
      <div class="nav-item">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="14" rx="2" stroke="#A09890" stroke-width="1.5"/>
          <path d="M7 10H15M7 13H12" stroke="#A09890" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M7 3V7M15 3V7" stroke="#A09890" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Historique</span>
      </div>
      <div class="nav-item" @click="goToScanner">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="2" width="6" height="6" rx="1" stroke="#A09890" stroke-width="1.5"/>
          <rect x="2" y="14" width="6" height="6" rx="1" stroke="#A09890" stroke-width="1.5"/>
          <rect x="14" y="2" width="6" height="6" rx="1" stroke="#A09890" stroke-width="1.5"/>
          <rect x="3.5" y="3.5" width="3" height="3" fill="#A09890"/>
          <rect x="3.5" y="15.5" width="3" height="3" fill="#A09890"/>
          <rect x="15.5" y="3.5" width="3" height="3" fill="#A09890"/>
          <path d="M14 14H16M20 14V16M14 18H16M20 18V16M20 16H14" stroke="#A09890" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Scanner</span>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

/* Header */
.header {
  padding: 10px 20px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.logo {
  font-size: 23px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.7px;
}

.wallet-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* Menu wallet */
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

.menu-item:hover { background: var(--border-subtle); }
.menu-item.danger { color: var(--red); }

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
  box-shadow: 0 1px 6px rgba(0,0,0,0.12);
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

/* Content */
.content {
  flex: 1;
  padding: 0 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

/* Balance card */
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

.balance-sub {
  font-size: 10px;
  color: rgba(0,0,0,0.4);
  margin-top: 2px;
}

/* Section row */
.section-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dark);
}

.new-btn {
  background: var(--dark);
  border: none;
  border-radius: 20px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  transition: opacity 0.15s;
}

.new-btn:hover { opacity: 0.8; }

.new-plus {
  font-size: 15px;
  line-height: 1;
  margin-top: -1px;
}

/* Group list */
.group-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
  overflow: hidden;
}

.group-card {
  background: var(--bg-card);
  border: none;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s, box-shadow 0.12s;
  width: 100%;
}

.group-card:hover { transform: scale(0.99); }
.group-card:active { transform: scale(0.97); }

.group-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
  margin-bottom: 2px;
}

.group-meta {
  font-size: 11px;
  color: var(--text);
}

.group-balance {
  text-align: right;
  flex-shrink: 0;
}

.group-amount {
  font-size: 13px;
  font-weight: 600;
}

.group-label {
  font-size: 10px;
  color: var(--text);
  margin-top: 1px;
}

/* Bottom nav */
.bottom-nav {
  border-top: 1px solid var(--border);
  background: var(--bg-card);
  padding: 10px 4px 26px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 52px;
  cursor: pointer;
}

.nav-item span {
  font-size: 10px;
  color: #A09890;
  font-weight: 500;
}

.nav-item.active span {
  color: var(--accent);
  font-weight: 700;
}
</style>
