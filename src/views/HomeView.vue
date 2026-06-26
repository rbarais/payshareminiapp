<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import GroupCard from '../components/GroupCard.vue';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter()
const session = useSession()
const store = useGroupsStore()

const showEur = ref(false);
const showMenu = ref(false);

const userId = computed(() => session.user.value?.id ?? '');

// Groupes réels + nb de dépenses + solde net de l'utilisateur dans chacun.
const groups = computed(() =>
  store.groups.value.map((g) => ({
    group: g,
    expenseCount: store.groupExpenses(g.id).length,
    balance: store.groupBalanceForUser(g.id, userId.value),
  })),
);

// Solde global agrégé : ce qu'on te doit (soldes positifs) vs ce que tu dois.
const credited = computed(() =>
  groups.value.reduce((s, g) => s + Math.max(0, g.balance), 0),
);
const owed = computed(() =>
  groups.value.reduce((s, g) => s + Math.max(0, -g.balance), 0),
);

function disconnect() {
  showMenu.value = false;
  session.disconnect();
  router.replace({ name: 'home' });
}

function goToNewGroup() {
  router.push({ name: 'newGroup' })
}

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } })
}
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
            <div class="balance-amount">{{ showEur ? 'Bientôt' : '+' + credited.toFixed(1) + ' NIM' }}</div>
          </div>
          <div class="balance-right">
            <div class="balance-label">Tu dois</div>
            <div class="balance-amount">{{ showEur ? 'Bientôt' : '−' + owed.toFixed(1) + ' NIM' }}</div>
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
      <div v-if="groups.length" class="group-list">
        <GroupCard
          v-for="g in groups"
          :key="g.group.id"
          :group="g.group"
          :expense-count="g.expenseCount"
          :balance="g.balance"
          @click="goToGroup(g.group.id)"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="empty">
        <div class="empty-icon">
          <svg width="34" height="34" viewBox="0 0 22 22" fill="none">
            <circle cx="8" cy="8.5" r="3" stroke="#C8C5BF" stroke-width="1.5"/>
            <circle cx="15" cy="8.5" r="3" stroke="#C8C5BF" stroke-width="1.5"/>
            <path d="M2 19C2 16.24 4.69 14 8 14C11.31 14 14 16.24 14 19" stroke="#C8C5BF" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M15 14C18.31 14 21 16.24 21 19" stroke="#C8C5BF" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="empty-title">Aucun groupe ici</div>
        <div class="empty-sub">Crée un groupe ou rejoins-en un via QR code</div>
        <button class="empty-cta" @click="goToNewGroup">+ Nouveau groupe</button>
      </div>
    </div>

    <!-- Bottom nav -->
    <BottomNav active="home" />
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

/* Empty state */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: var(--shadow-sm);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
}

.empty-sub {
  font-size: 12px;
  color: var(--text);
  max-width: 220px;
  line-height: 1.4;
}

.empty-cta {
  margin-top: 12px;
  background: var(--accent);
  border: none;
  border-radius: 14px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}
</style>
