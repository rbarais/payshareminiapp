<template>
  <div class="screen">
    <div class="header">
      <div class="title">{{ t('groups.title') }}</div>
      <button class="pill dark" @click="goToNewGroup">
        <PlusIcon width="12" height="12" />
        <span>{{ t('groups.new') }}</span>
      </button>
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
      <div v-if="filteredGroups.length" class="group-list">
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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useI18n } from '../stores/i18n';
import GroupCard from '../components/GroupCard.vue';
import EmptyState from '../components/EmptyState.vue';
import PlusIcon from '../assets/svg/plus.svg';
import UsersIcon from '../assets/svg/users.svg';

type Filter = 'all' | 'active' | 'settled';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const { t } = useI18n();

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

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } });
}
</script>

<style scoped>
.header {
  padding: 14px 20px;
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

.filters {
  display: flex;
  gap: 8px;
  padding: 0 20px 12px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  padding: 0 18px 16px;
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
</style>
