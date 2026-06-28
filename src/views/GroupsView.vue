<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import GroupCard from '../components/GroupCard.vue';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();

const userId = computed(() => session.user.value?.id ?? '');

const groups = computed(() =>
  store.groups.value.map((group) => ({
    group,
    expenseCount: store.groupExpenses(group.id).length,
    grossDebt: store.grossDebtTotal(group.id, userId.value),
    grossCredit: store.grossCreditForUser(group.id, userId.value),
  })),
);

function goToNewGroup() {
  router.push({ name: 'newGroup' });
}

function goToGroup(id: string) {
  router.push({ name: 'group', params: { id } });
}
</script>

<template>
  <div class="screen">
    <div class="header">
      <div class="title">Mes groupes</div>
      <button class="new-btn" @click="goToNewGroup">
        <span class="new-plus">+</span>
        <span>Nouveau</span>
      </button>
    </div>

    <div class="content">
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

      <div v-else class="empty">
        <div class="empty-icon">
          <svg width="34" height="34" viewBox="0 0 22 22" fill="none">
            <circle cx="8" cy="8.5" r="3" stroke="#C8C5BF" stroke-width="1.5" />
            <circle cx="15" cy="8.5" r="3" stroke="#C8C5BF" stroke-width="1.5" />
            <path
              d="M2 19C2 16.24 4.69 14 8 14C11.31 14 14 16.24 14 19"
              stroke="#C8C5BF"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M15 14C18.31 14 21 16.24 21 19"
              stroke="#C8C5BF"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="empty-title">Aucun groupe ici</div>
        <div class="empty-sub">Crée un groupe ou rejoins-en un via QR code</div>
        <button class="empty-cta" @click="goToNewGroup">+ Nouveau groupe</button>
      </div>
    </div>

    <BottomNav active="groups" />
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
}

.new-plus {
  font-size: 15px;
  line-height: 1;
  margin-top: -1px;
}

.content {
  flex: 1;
  padding: 0 18px 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
  overflow-y: auto;
}

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
