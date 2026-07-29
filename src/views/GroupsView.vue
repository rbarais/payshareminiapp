<template>
  <div class="screen">
    <div class="header">
      <div class="title">{{ t('groups.title') }}</div>
      <div class="header-actions">
        <button class="icon-btn" :aria-label="t('group.scanQr')" @click="goToScan">
          <QrCodeIcon width="16" height="16" />
        </button>
        <button class="icon-btn dark" :aria-label="t('groups.new')" @click="goToNewGroup">
          <PlusIcon width="14" height="14" />
        </button>
      </div>
    </div>

    <div v-if="groups.length" class="filters">
      <button
        v-for="option in filters"
        :key="option"
        class="pill"
        :class="{ active: filter === option }"
        @click="filter = option"
      >
        {{ filterLabel(option) }}
      </button>
    </div>

    <div class="content">
      <!-- Group list skeleton: keyed on the unfiltered count — a filter's
           "no match" state only makes sense once real data has arrived -->
      <div v-if="skeleton.active.value" class="group-list">
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

      <div v-else-if="filteredGroups.length" class="group-list">
        <GroupCard
          v-for="entry in filteredGroups"
          :key="entry.group.id"
          :group="entry.group"
          :expense-count="entry.expenseCount"
          :gross-debt="entry.grossDebt"
          :gross-credit="entry.grossCredit"
          @click="goToGroup(entry.group.id)"
        />
      </div>

      <div v-else-if="groups.length" class="empty-filtered">
        {{ t('groups.emptyFiltered') }}
      </div>

      <EmptyState
        v-else
        :title="t('groups.emptyTitle')"
        :sub="t('groups.emptySub')"
        :cta="t('groups.emptyCta')"
        @cta="goToNewGroup"
      >
        <UsersIcon />
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useI18n } from '../stores/i18n';
import { useToast } from '../stores/toast';
import { captureError } from '../utils/errors';
import { useForegroundRefresh } from '../composables/useForegroundRefresh';
import { useDelayedLoading, SKELETON_DELAY_MS } from '../composables/useDelayedLoading';
import GroupCard from '../components/GroupCard.vue';
import EmptyState from '../components/EmptyState.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import PlusIcon from '../assets/svg/plus.svg';
import QrCodeIcon from '../assets/svg/qrCode.svg';
import UsersIcon from '../assets/svg/users.svg';

type Filter = 'all' | 'active' | 'settled';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const { t } = useI18n();

const toast = useToast();
const skeleton = useDelayedLoading();

// Same stale-while-revalidate refresh as Home/History — this view reads the
// same store but wasn't triggering its own fetch, so a direct visit to
// /groups could show a stale or empty list with no refresh in flight.
async function sync(): Promise<void> {
  skeleton.start(store.hydrated.value || store.groups.value.length ? SKELETON_DELAY_MS : 0);
  try {
    await store.refreshAll();
  } catch (err) {
    captureError(err, 'GroupsView.refreshAll');
    toast.show(t('error.syncFailed'), 'error');
  } finally {
    skeleton.stop();
  }
}

onMounted(sync);
useForegroundRefresh(sync);

const filters: Filter[] = ['all', 'active', 'settled'];
const filter = ref<Filter>('all');

const userId = computed(() => session.user.value?.id ?? '');

const groups = computed(() =>
  store.groups.value.map((group) => ({
    group,
    expenseCount: store.groupExpenses(group.id).length,
    grossDebt: store.grossDebtTotal(group.id, userId.value),
    grossCredit: store.grossCreditForUser(group.id, userId.value),
  })),
);

// A group is settled when neither a debt nor a credit remains (same ~0
// threshold as GroupView); active groups still have an open balance.
const filteredGroups = computed(() => {
  if (filter.value === 'all') return groups.value;
  return groups.value.filter((entry) => {
    const settled = entry.grossDebt <= 0.005 && entry.grossCredit <= 0.005;
    return filter.value === 'settled' ? settled : !settled;
  });
});

function filterLabel(option: Filter): string {
  if (option === 'active') return t('groups.filterActive');
  if (option === 'settled') return t('groups.filterSettled');
  return t('groups.filterAll');
}

function goToNewGroup() {
  router.push({ name: 'newGroup' });
}

function goToScan() {
  router.push({ name: 'scan' });
}

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } });
}
</script>

<style scoped>
.header {
  padding: 14px var(--gutter);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filters {
  display: flex;
  gap: 8px;
  padding: 0 var(--gutter) 12px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  padding: 0 var(--gutter) calc(16px + var(--nav-h));
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
}

.empty-filtered {
  padding: 40px 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-mid);
}

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
