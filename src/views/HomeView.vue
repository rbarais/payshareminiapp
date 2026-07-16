<template>
  <div class="screen">
    <!-- Header -->
    <div class="header">
      <div class="logo">PayShare</div>
      <WalletBadge :address="userId" @open="emit('open-settings')" />
    </div>

    <!-- Content -->
    <div class="content">
      <GlobalBalanceCard :credited="credited" :owed="owed" />

      <!-- Groups header -->
      <div class="section-row">
        <span class="section-title">{{ t('home.myGroups') }}</span>
        <span v-if="syncing" class="syncing-dot" />
        <button class="pill dark" @click="goToNewGroup">
          <PlusIcon width="12" height="12" />
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
      <EmptyState
        v-else
        :title="t('home.emptyTitle')"
        :sub="t('home.emptySub')"
        :cta="t('home.emptyCta')"
        @cta="goToNewGroup"
      >
        <UsersIcon />
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import GroupCard from '../components/GroupCard.vue';
import WalletBadge from '../components/WalletBadge.vue';
import GlobalBalanceCard from '../components/GlobalBalanceCard.vue';
import EmptyState from '../components/EmptyState.vue';
import PlusIcon from '../assets/svg/plus.svg';
import UsersIcon from '../assets/svg/users.svg';
import { captureError } from '../utils/errors';
import { useI18n } from '../stores/i18n';

const emit = defineEmits<{ 'open-settings': [] }>();

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

function goToNewGroup() {
  router.push({ name: 'newGroup' });
}

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } });
}
</script>

<style scoped>
/* Header */
.header {
  padding: 10px 20px 14px;
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
  padding: 0 18px 16px;
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
</style>
