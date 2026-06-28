<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Expense, GroupIcon } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { useI18n } from '../stores/i18n';
import { buildInviteUrl, buildInviteDeeplink } from '../utils/room';
import InitialAvatar from '../components/InitialAvatar.vue';
import ExpenseCard from '../components/ExpenseCard.vue';
import { captureError } from '../utils/errors';
import { eurRate, fetchRate } from '../utils/rate';
import InviteSheet from '../components/InviteSheet.vue';
import SettleSheet from '../components/SettleSheet.vue';
import BaseSheet from '../components/BaseSheet.vue';
import GroupIconPicker from '../components/GroupIconPicker.vue';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

const props = defineProps<{ id: string }>();

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();
const { t, locale } = useI18n();

const userId = computed(() => session.user.value?.id ?? '');
const group = computed(() => store.getGroup(props.id));
const expenses = computed(() => store.groupExpenses(props.id));
// Stable UUID of the current member in this group (undefined if not linked yet)
const myMemberId = computed(() => store.myMemberId(props.id, userId.value));
// True if the user is the group creator
const isCreator = computed(() => group.value?.creatorId === userId.value);

// Gross debts (no netting) grouped by creditor, and their aggregates.
const debts = computed(() => store.grossDebtsForUser(props.id, userId.value));
const grossDebt = computed(() => store.grossDebtTotal(props.id, userId.value));
const grossCredit = computed(() => store.grossCreditForUser(props.id, userId.value));

// Redirect if the group does not exist (invalid / deleted id).
onMounted(async () => {
  if (!group.value) {
    router.replace({ name: 'home' });
    return;
  }
  // Refresh the group's expenses from Supabase on open.
  try {
    await store.refreshGroupExpenses(props.id);
  } catch (err) {
    captureError(err, 'GroupView.refreshGroupExpenses');
    toast.show(t('error.syncFailed'), 'error');
  }
  fetchRate();
});

const monthLabel = computed(() =>
  group.value
    ? group.value.createdAt.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'fr-FR', {
        month: 'short',
        year: 'numeric',
      })
    : '',
);

function memberName(id: string): string {
  if (id === myMemberId.value) return t('group.you');
  return group.value?.members.find((member) => member.id === id)?.name ?? t('group.unknown');
}

function userShare(expenseId: string): number {
  const expense = expenses.value.find((entry) => entry.id === expenseId);
  return expense?.shares.find((share) => share.memberId === myMemberId.value)?.amount ?? 0;
}

function eurApprox(nim: number): string {
  if (eurRate.value == null) return '';
  return '≈ ' + (nim * eurRate.value).toFixed(2) + ' €';
}

// ── Invitation to join the group (QR + link) ────────────────────────────────
const showInviteQR = ref(false);
const inviteHttpsUrl = ref('');
const inviteQrDeeplink = ref('');

async function invite() {
  const currentGroup = group.value;
  if (!currentGroup?.inviteToken) {
    toast.show(t('group.syncRequired'), 'error');
    return;
  }
  inviteHttpsUrl.value = buildInviteUrl(currentGroup.id, currentGroup.inviteToken);
  inviteQrDeeplink.value = buildInviteDeeplink(inviteHttpsUrl.value);
  showInviteQR.value = true;
}

async function copyInviteLink() {
  if (!navigator.clipboard?.writeText) {
    toast.show(inviteHttpsUrl.value, 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(inviteHttpsUrl.value);
    toast.show(t('group.inviteCopied'), 'success');
  } catch {
    toast.show(inviteHttpsUrl.value, 'info');
  }
}

// ── Invitation to pay (dedicated sheet) ─────────────────────────────────────
const inviteExpense = ref<Expense | null>(null);

// ── Group editing (name + icon) ─────────────────────────────────────────────
const editGroupOpen = ref(false);
const editGroupName = ref('');
const editGroupIcon = ref<GroupIcon>('person');

function openEditGroup() {
  if (!group.value) return;
  editGroupName.value = group.value.name;
  editGroupIcon.value = group.value.icon;
  editGroupOpen.value = true;
}

function saveGroup() {
  const name = editGroupName.value.trim();
  if (!name) return;
  store.updateGroup(props.id, { name, icon: editGroupIcon.value });
  editGroupOpen.value = false;
  toast.show(t('group.groupUpdated'), 'success');
}

// ── Expense editing (description) ───────────────────────────────────────────
const editExpense = ref<Expense | null>(null);
const editExpenseDesc = ref('');

function openEditExpense(expense: Expense) {
  editExpense.value = expense;
  editExpenseDesc.value = expense.description;
}

function closeEditExpense() {
  editExpense.value = null;
  editExpenseDesc.value = '';
}

function saveExpense() {
  const description = editExpenseDesc.value.trim();
  if (!description || !editExpense.value) return;
  store.updateExpense(editExpense.value.id, { description });
  closeEditExpense();
  toast.show(t('group.expenseUpdated'), 'success');
}

function goBack() {
  router.back();
}

function goToAddExpense() {
  router.push({ name: 'addExpense', query: { groupId: props.id } });
}

// ── Adding a placeholder member (creator only) ──────────────────────────────
const showAddMember = ref(false);
const addMemberName = ref('');
const addingMember = ref(false);

async function confirmAddMember() {
  const name = addMemberName.value.trim();
  if (!name || addingMember.value) return;
  addingMember.value = true;
  try {
    await store.addPlaceholderMember(props.id, name);
    toast.show(t('toast.memberAdded', { name }), 'success');
    showAddMember.value = false;
    addMemberName.value = '';
  } catch (err) {
    captureError(err, 'GroupView.addPlaceholderMember');
    toast.show(t('group.addMemberFailed'), 'error');
  } finally {
    addingMember.value = false;
  }
}

// ── Settlement: sheet listing the creditors (one payment per person) ────────
const showSettleSheet = ref(false);

function openSettle() {
  if (!debts.value.length) return;
  showSettleSheet.value = true;
}
</script>

<template>
  <div v-if="group" class="screen">
    <!-- Header -->
    <div class="header">
      <button class="icon-btn" @click="goBack">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path
            d="M10.5 4L6 8.5L10.5 13"
            stroke="#1A1916"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <div class="header-info">
        <div class="header-title">{{ group.name }}</div>
        <div class="header-sub">{{ t('group.membersCount', { count: group.members.length }) }} · {{ monthLabel }}</div>
      </div>
      <button class="icon-btn" @click="openEditGroup">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="3.5" r="1.3" fill="#3D3B35" />
          <circle cx="8" cy="8" r="1.3" fill="#3D3B35" />
          <circle cx="8" cy="12.5" r="1.3" fill="#3D3B35" />
        </svg>
      </button>
    </div>

    <!-- Members + invite -->
    <div class="members-row">
      <InitialAvatar
        v-for="(member, index) in group.members"
        :key="member.id"
        :name="member.name"
        :index="index"
        :size="36"
        ring
      />
      <div v-if="isCreator" class="add-member-wrap">
        <button class="add-member-btn" @click="showAddMember = true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2V12M2 7H12" stroke="#8B8880" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <span class="add-member-label">{{ t('group.invite') }}</span>
      </div>
      <button class="qr-btn" @click="invite">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="#F6B221" stroke-width="1.4" />
          <rect x="2" y="11" width="5" height="5" rx="1" stroke="#F6B221" stroke-width="1.4" />
          <rect x="11" y="2" width="5" height="5" rx="1" stroke="#F6B221" stroke-width="1.4" />
          <rect x="3.5" y="3.5" width="2" height="2" fill="#F6B221" />
          <rect x="3.5" y="12.5" width="2" height="2" fill="#F6B221" />
          <rect x="12.5" y="3.5" width="2" height="2" fill="#F6B221" />
          <path
            d="M11 11H13M15 11V13M11 15H13M15 15V13M15 13H11"
            stroke="#F6B221"
            stroke-width="1.4"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Gross debt: what you owe (per-creditor detail in the sheet) -->
    <div v-if="grossDebt > 0.005" class="debt-card">
      <div>
        <div class="debt-who">{{ t('group.youOwe') }}</div>
        <div class="debt-amount">{{ grossDebt.toFixed(2) }} NIM</div>
        <div v-if="eurApprox(grossDebt)" class="eur-approx">{{ eurApprox(grossDebt) }}</div>
      </div>
      <button class="settle-btn" @click="openSettle">{{ t('group.settle') }}</button>
    </div>

    <!-- Gross credit: what others owe you (can coexist with the debt) -->
    <div v-if="grossCredit > 0.005" class="credit-card">
      <div class="credit-title">{{ t('group.owedToYou') }}</div>
      <div class="credit-amount">{{ grossCredit.toFixed(2) }} NIM</div>
      <div v-if="eurApprox(grossCredit)" class="eur-approx">{{ eurApprox(grossCredit) }}</div>
    </div>

    <!-- Settled: neither debt nor credit -->
    <div v-if="grossDebt <= 0.005 && grossCredit <= 0.005" class="settled-card">
      <div class="settled-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M4 9L7.5 12.5L14 6"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div>
        <div class="settled-title">{{ t('group.settledTitle') }}</div>
        <div class="settled-sub">{{ t('group.settledSub') }}</div>
      </div>
    </div>

    <!-- Expenses header -->
    <div class="expenses-header">
      <span class="expenses-title">{{ t('group.expenses') }}</span>
      <button class="add-btn" @click="goToAddExpense">{{ t('group.addExpense') }}</button>
    </div>

    <!-- Expense list -->
    <div v-if="expenses.length" class="expense-list">
      <ExpenseCard
        v-for="exp in expenses"
        :key="exp.id"
        :expense="exp"
        :user-share="userShare(exp.id)"
        :paid-by-name="memberName(exp.paidBy)"
        :is-mine="exp.paidBy === myMemberId"
        @select="inviteExpense = exp"
        @edit="openEditExpense(exp)"
      />
    </div>

    <!-- Empty expenses -->
    <div v-else class="expense-empty">
      <div class="expense-empty-text">{{ t('group.noExpenses') }}</div>
      <button class="expense-empty-cta" @click="goToAddExpense">{{ t('group.addExpenseCta') }}</button>
    </div>

    <!-- Sheet: group invite QR -->
    <BaseSheet v-if="showInviteQR" @close="showInviteQR = false">
      <div class="sheet-title">{{ t('group.inviteSheetTitle') }}</div>
      <div class="sheet-sub">{{ t('group.inviteSheetSub') }}</div>
      <div class="invite-qr-box">
        <QRCodeGenerator :url="inviteQrDeeplink" :size="200" />
      </div>
      <p class="invite-qr-hint">{{ t('group.inviteQrHint') }}</p>
      <button class="sheet-copy" @click="copyInviteLink">{{ t('group.copyInviteLink') }}</button>
      <p class="invite-qr-note">{{ t('group.inviteQrNote') }}</p>
    </BaseSheet>

    <!-- Sheet: settle your debts (one payment per creditor) -->
    <SettleSheet
      v-if="showSettleSheet"
      :group="group"
      :user-id="userId"
      :debts="debts"
      @close="showSettleSheet = false"
    />

    <!-- Sheet: invite to pay a share -->
    <InviteSheet
      v-if="inviteExpense"
      :expense="inviteExpense"
      :group="group"
      :user-id="userId"
      @close="inviteExpense = null"
    />

    <!-- Sheet: edit the group (name + icon) -->
    <BaseSheet v-if="editGroupOpen" @close="editGroupOpen = false">
      <div class="sheet-title">{{ t('group.editSheetTitle') }}</div>
      <div class="sheet-sub">{{ t('group.editSheetSub') }}</div>

      <div class="edit-label">{{ t('group.iconLabel') }}</div>
      <GroupIconPicker v-model="editGroupIcon" />

      <div class="edit-label">{{ t('group.nameLabel') }}</div>
      <input
        v-model="editGroupName"
        class="edit-input"
        type="text"
        :placeholder="t('group.groupNamePlaceholder')"
        @keyup.enter="saveGroup"
      />

      <button class="sheet-copy" :disabled="!editGroupName.trim()" @click="saveGroup">
        {{ t('common.save') }}
      </button>
      <button class="sheet-back" @click="editGroupOpen = false">{{ t('common.cancel') }}</button>
    </BaseSheet>

    <!-- Sheet: add a placeholder member (creator only) -->
    <BaseSheet
      v-if="showAddMember"
      @close="
        showAddMember = false;
        addMemberName = '';
      "
    >
      <div class="sheet-title">{{ t('group.addMemberTitle') }}</div>
      <div class="sheet-sub">{{ t('group.addMemberSub') }}</div>

      <div class="edit-label">{{ t('group.firstNameLabel') }}</div>
      <input
        v-model="addMemberName"
        class="edit-input"
        type="text"
        :placeholder="t('group.firstNamePlaceholder')"
        @keyup.enter="confirmAddMember"
      />

      <button
        class="sheet-copy"
        :disabled="!addMemberName.trim() || addingMember"
        @click="confirmAddMember"
      >
        {{ addingMember ? t('group.adding') : t('common.add') }}
      </button>
      <button
        class="sheet-back"
        @click="
          showAddMember = false;
          addMemberName = '';
        "
      >
        {{ t('common.cancel') }}
      </button>
    </BaseSheet>

    <!-- Sheet: edit an expense description -->
    <BaseSheet v-if="editExpense" @close="closeEditExpense">
      <div class="sheet-title">{{ t('group.editExpenseTitle') }}</div>
      <div class="sheet-sub">
        {{ editExpense.amount.toFixed(2) }} {{ editExpense.currency }} · {{ t('group.paidByPrefix') }}
        {{ memberName(editExpense.paidBy) }}
      </div>

      <div class="edit-label">{{ t('group.descriptionLabel') }}</div>
      <input
        v-model="editExpenseDesc"
        class="edit-input"
        type="text"
        :placeholder="t('group.expenseDescPlaceholder')"
        @keyup.enter="saveExpense"
      />

      <button class="sheet-copy" :disabled="!editExpenseDesc.trim()" @click="saveExpense">
        {{ t('common.save') }}
      </button>
      <button class="sheet-back" @click="closeEditExpense">{{ t('common.cancel') }}</button>
    </BaseSheet>
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
  padding: 8px 18px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
}

.header-sub {
  font-size: 11px;
  color: var(--text);
  margin-top: 1px;
}

/* Members */
.members-row {
  padding: 0 18px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.add-member-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.add-member-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--border);
  border: 1.5px dashed #a09890;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-member-btn:hover {
  opacity: 0.75;
}

.add-member-label {
  font-size: 9px;
  color: var(--muted, #8b8880);
  font-weight: 500;
}

.qr-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--dark);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}

.qr-btn:hover {
  opacity: 0.75;
}

/* Balance cards */
.debt-card {
  margin: 0 18px 14px;
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.debt-who {
  font-size: 11px;
  color: var(--red);
  font-weight: 600;
  margin-bottom: 3px;
}
.debt-amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--red);
  letter-spacing: -0.5px;
}

.settle-btn {
  background: var(--red);
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
}

.settle-btn:hover {
  opacity: 0.85;
}

.credit-card {
  margin: 0 18px 14px;
  background: var(--green-bg);
  border: 1px solid #c6efe0;
  border-radius: 16px;
  padding: 14px 16px;
  flex-shrink: 0;
}

.credit-title {
  font-size: 11px;
  color: var(--green);
  font-weight: 600;
  margin-bottom: 3px;
}
.credit-amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--green);
  letter-spacing: -0.5px;
}

.settled-card {
  margin: 0 18px 14px;
  background: #e8f8f2;
  border: 1px solid #c6efe0;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.settled-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.settled-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--green);
}
.settled-sub {
  font-size: 11px;
  color: var(--green);
  opacity: 0.75;
  margin-top: 2px;
}

/* Expenses */
.expenses-header {
  padding: 0 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.expenses-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
}

.add-btn {
  background: var(--accent);
  border: none;
  border-radius: 20px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-btn:hover {
  opacity: 0.85;
}

.expense-list {
  flex: 1;
  padding: 0 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

/* Empty expenses */
.expense-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px 18px;
}

.expense-empty-text {
  font-size: 13px;
  color: var(--text);
}

.expense-empty-cta {
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

.invite-qr-box {
  display: flex;
  justify-content: center;
  margin: 16px 0 8px;
}

.invite-qr-hint {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  line-height: 1.5;
  margin: 0 0 4px;
}

.invite-qr-note {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  margin: 6px 0 0;
  opacity: 0.7;
}

/* Edit sheets (content inside BaseSheet) */
.sheet-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
}
.sheet-sub {
  font-size: 12px;
  color: var(--text);
  margin-top: 2px;
  margin-bottom: 14px;
}

.edit-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin: 14px 0 10px;
}

.edit-input {
  width: 100%;
  border: 1.5px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  background: var(--bg-card);
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.edit-input::placeholder {
  color: var(--text);
}

.sheet-copy {
  width: 100%;
  margin-top: 14px;
  background: var(--accent);
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}

.sheet-copy:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sheet-back {
  width: 100%;
  margin-top: 8px;
  background: none;
  border: none;
  padding: 10px;
  font-size: 13px;
  color: var(--text-mid);
  cursor: pointer;
  font-family: inherit;
}

.eur-approx {
  font-size: 11px;
  color: var(--text-mid);
  margin-top: 2px;
  font-weight: 600;
}
</style>
