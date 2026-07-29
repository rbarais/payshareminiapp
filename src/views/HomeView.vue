<template>
  <div class="screen">
    <!-- Header -->
    <div class="header">
      <div class="logo">PayShare</div>
      <NotificationBell
        data-tour="bell"
        :unread="notifications.hasUnread.value"
        @click="openNotifications"
      />
    </div>

    <!-- Content -->
    <div class="content">
      <GlobalBalanceCard data-tour="balance" :credited="credited" :owed="owed" />

      <!-- Groups header -->
      <div class="section-row">
        <span class="section-title">{{ t('home.myGroups') }}</span>
        <div class="section-actions">
          <span v-if="syncing" class="syncing-dot" />
          <button
            class="pill dark icon-btn"
            data-tour="scan"
            :aria-label="t('group.scanQr')"
            @click="goToScan"
          >
            <QrCodeIcon width="16" height="16" />
          </button>
          <button class="pill dark icon-btn" data-tour="newgroup" @click="goToNewGroup">
            <PlusIcon width="16" height="16" />
          </button>
        </div>
      </div>

      <!-- Group list skeleton: immediate on cold start, delayed on a slow refresh -->
      <div v-if="skeleton.active.value" class="group-list" data-tour="grouplist">
        <div v-for="n in 3" :key="n" class="group-card-skeleton">
          <SkeletonBlock width="44px" height="44px" radius="13px" />
          <div class="group-card-skeleton-info">
            <SkeletonBlock width="60%" height="13px" />
            <SkeletonBlock width="40%" height="11px" />
          </div>
          <div class="group-card-skeleton-amount">
            <SkeletonBlock width="50px" height="13px" />
          </div>
        </div>
      </div>

      <!-- Group list -->
      <div v-else-if="groups.length" class="group-list" data-tour="grouplist">
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
      <EmptyState
        v-else
        data-tour="grouplist"
        :title="t('home.emptyTitle')"
        :sub="t('home.emptySub')"
        :cta="t('home.emptyCta')"
        @cta="goToNewGroup"
      >
        <UsersIcon />
      </EmptyState>
    </div>

    <NotificationsSheet
      v-if="showNotifications"
      :items="notifications.items.value"
      @close="showNotifications = false"
      @select="goToGroupFromNotification"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import GroupCard from '../components/GroupCard.vue';
import GlobalBalanceCard from '../components/GlobalBalanceCard.vue';
import EmptyState from '../components/EmptyState.vue';
import NotificationBell from '../components/NotificationBell.vue';
import NotificationsSheet from '../components/NotificationsSheet.vue';
import PlusIcon from '../assets/svg/plus.svg';
import QrCodeIcon from '../assets/svg/qrCode.svg';
import UsersIcon from '../assets/svg/users.svg';
import { captureError } from '../utils/errors';
import { useI18n } from '../stores/i18n';
import { useNotifications } from '../composables/useNotifications';
import { closeForNavigation } from '../composables/modalBack';
import { useForegroundRefresh } from '../composables/useForegroundRefresh';
import { useDelayedLoading, SKELETON_DELAY_MS } from '../composables/useDelayedLoading';
import SkeletonBlock from '../components/SkeletonBlock.vue';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();
const { t } = useI18n();
const notifications = useNotifications();
const skeleton = useDelayedLoading();
const showNotifications = ref(false);

// Hydrate groups + expenses from the DB on open (stale-while-revalidate).
// Skeleton shows immediately if there is nothing cached yet, or after a
// short delay if a refresh of already-visible data takes a while.
async function sync(): Promise<void> {
  skeleton.start(store.hydrated.value || store.groups.value.length ? SKELETON_DELAY_MS : 0);
  try {
    await store.refreshAll();
  } catch (err) {
    captureError(err, 'HomeView.refreshAll');
    toast.show(t('error.syncFailed'), 'error');
  } finally {
    skeleton.stop();
  }
}

onMounted(sync);
useForegroundRefresh(sync);

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

function goToNewGroup() {
  router.push({ name: 'newGroup' });
}

function goToScan() {
  router.push({ name: 'scan' });
}

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } });
}

function openNotifications() {
  showNotifications.value = true;
  notifications.markSeen();
}

function goToGroupFromNotification(groupId: string) {
  closeForNavigation();
  showNotifications.value = false;
  goToGroup(groupId);
}
</script>

<style scoped>
/* Header */
.header {
  padding: 10px var(--gutter) 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.logo {
  font-size: 27px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.7px;
}

/* Content */
.content {
  flex: 1;
  padding: 0 var(--gutter) calc(16px + var(--nav-h));
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  min-height: 0;
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  flex-shrink: 0;
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

/* Group list */
.group-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

@media (min-width: 600px) {
  .group-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-content: start;
    gap: 12px;
  }
}

.group-card-skeleton {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.group-card-skeleton-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-card-skeleton-amount {
  flex-shrink: 0;
}
</style>
