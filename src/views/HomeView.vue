<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import GroupCard from '../components/GroupCard.vue';
import BottomNav from '../components/BottomNav.vue';
import WalletBadge from '../components/WalletBadge.vue';
import SettingsSheet from '../components/SettingsSheet.vue';
import GlobalBalanceCard from '../components/GlobalBalanceCard.vue';
import { captureError } from '../utils/errors';
import { useI18n } from '../stores/i18n';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();
const { t } = useI18n();

// Hydrate groups + expenses from the DB on open (stale-while-revalidate).
onMounted(async () => {
  try {
    await store.refreshAll();
  } catch (err) {
    captureError(err, 'HomeView.refreshAll');
    toast.show(t('error.syncFailed'), 'error');
  }
});

const userId = computed(() => session.user.value?.id ?? '');
const syncing = computed(() => store.syncing.value);

// Real groups + expense count + the user's gross debts/credits.
const groups = computed(() =>
  store.groups.value.map((group) => ({
    group,
    expenseCount: store.groupExpenses(group.id).length,
    grossDebt: store.grossDebtTotal(group.id, userId.value),
    grossCredit: store.grossCreditForUser(group.id, userId.value),
  })),
);

// Aggregated global balance (gross): what others owe you vs what you owe.
const credited = computed(() => groups.value.reduce((sum, entry) => sum + entry.grossCredit, 0));
const owed = computed(() => groups.value.reduce((sum, entry) => sum + entry.grossDebt, 0));

const showSettings = ref(false);

function disconnect() {
  session.disconnect();
  router.replace({ name: 'home' });
}

function goToNewGroup() {
  router.push({ name: 'newGroup' });
}

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } });
}
</script>

<template>
  <div class="screen">
    <!-- Header -->
    <div class="header">
      <div class="logo">PayShare</div>
      <WalletBadge :address="session.walletShort.value" @open="showSettings = true" />
    </div>

    <!-- Content -->
    <div class="content">
      <GlobalBalanceCard :credited="credited" :owed="owed" />

      <!-- Groups header -->
      <div class="section-row">
        <span class="section-title">{{ t('home.myGroups') }}</span>
        <span v-if="syncing" class="syncing-dot" />
        <button class="new-btn" @click="goToNewGroup">
          <span class="new-plus">+</span>
          <span>{{ t('home.new') }}</span>
        </button>
      </div>

      <!-- Group list -->
      <div v-if="groups.length" class="group-list">
        <GroupCard
          v-for="entry in groups"
          :key="entry.group.id"
          :group="entry.group"
          :expense-count="entry.expenseCount"
          :gross-debt="entry.grossDebt"
          :gross-credit="entry.grossCredit"
          @click="goToGroup(entry.group.id)"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="empty">
        <div class="empty-icon">
          <svg width="34" height="34" viewBox="0 0 22 22" fill="none">
            <circle cx="8" cy="8.5" r="3" stroke="currentColor" stroke-width="1.5" />
            <circle cx="15" cy="8.5" r="3" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M2 19C2 16.24 4.69 14 8 14C11.31 14 14 16.24 14 19"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M15 14C18.31 14 21 16.24 21 19"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="empty-title">{{ t('home.emptyTitle') }}</div>
        <div class="empty-sub">{{ t('home.emptySub') }}</div>
        <button class="empty-cta" @click="goToNewGroup">{{ t('home.emptyCta') }}</button>
      </div>
    </div>

    <!-- Bottom nav -->
    <BottomNav active="home" />

    <SettingsSheet
      v-if="showSettings"
      @close="showSettings = false"
      @disconnect="
        showSettings = false;
        disconnect();
      "
    />
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

/* Content */
.content {
  flex: 1;
  padding: 0 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
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

.new-btn:hover {
  opacity: 0.8;
}

.syncing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.7;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.85);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
}

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
  color: var(--text);
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
