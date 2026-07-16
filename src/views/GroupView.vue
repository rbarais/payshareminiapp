<template>
  <div v-if="group" class="screen">
    <!-- Header -->
    <ScreenHeader :title="group.name" :subtitle="headerSub" @back="goBack">
      <button class="icon-btn" @click="openEditGroup"><DotsIcon /></button>
    </ScreenHeader>

    <!-- Members + invite -->
    <div class="members-row">
      <NimiqIdenticon
        v-for="member in group.members"
        :key="member.id"
        :address="member.address"
        :size="36"
      />
      <div v-if="isCreator" class="add-member-wrap">
        <button class="add-member-btn" @click="showAddMember = true">
          <PlusIcon />
        </button>
        <span class="add-member-label">{{ t('group.invite') }}</span>
      </div>
      <button class="qr-btn" @click="invite">
        <QrCodeIcon />
      </button>
    </div>

    <!-- What you owe: one card per creditor, pay everything in one tx -->
    <div v-if="debts.length" class="tosettle-section">
      <div class="tosettle-header">
        <span class="tosettle-title">{{ t('group.toSettle') }}</span>
        <span class="tosettle-total">
          {{ grossDebt.toFixed(2) }} NIM
          <template v-if="eurApprox(grossDebt)"> · {{ eurApprox(grossDebt) }}</template>
        </span>
      </div>
      <CreditorList :group="group" :debts="debts" />
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
        <CheckIcon width="16" height="16" />
      </div>
      <div>
        <div class="settled-title">{{ t('group.settledTitle') }}</div>
        <div class="settled-sub">{{ t('group.settledSub') }}</div>
      </div>
    </div>

    <!-- Expenses header -->
    <div class="expenses-header">
      <span class="expenses-title">{{ t('group.expenses') }}</span>
      <button class="pill accent" @click="goToAddExpense">{{ t('group.addExpense') }}</button>
    </div>

    <!-- Expense list -->
    <div v-if="expenses.length" class="expense-list">
      <ExpenseCard
        v-for="exp in expenses"
        :key="exp.id"
        :expense="exp"
        :user-share="userShare(exp.id)"
        :progress="expenseProgress(exp)"
        :paid-by-name="memberName(exp.paidBy)"
        :is-mine="exp.paidBy === myMemberId"
        :settled="shareStatus(exp.id)?.settled ?? false"
        :tx-hash="shareStatus(exp.id)?.txHash ?? null"
        :clickable="!store.expenseFullySettled(props.id, exp.id)"
        @select="onSelectExpense(exp)"
        @edit="openEditExpense(exp)"
      />
    </div>

    <!-- Empty expenses -->
    <div v-else class="expense-empty">
      <div class="expense-empty-text">{{ t('group.noExpenses') }}</div>
      <button class="expense-empty-cta" @click="goToAddExpense">
        {{ t('group.addExpenseCta') }}
      </button>
    </div>

    <!-- Sheet: group invite QR -->
    <BaseSheet
      v-if="showInviteQR"
      :title="t('group.inviteSheetTitle')"
      :subtitle="t('group.inviteSheetSub')"
      @close="showInviteQR = false"
    >
      <div class="invite-qr-box">
        <QRCodeGenerator :url="inviteQrDeeplink" :size="200" />
      </div>
      <p class="invite-qr-hint">{{ t('group.inviteQrHint') }}</p>
      <button class="btn-primary" @click="copyInviteLink">{{ t('group.copyInviteLink') }}</button>
      <p class="invite-qr-note">{{ t('group.inviteQrNote') }}</p>
    </BaseSheet>

    <!-- Sheet: invite to pay a share -->
    <InviteSheet
      v-if="inviteExpense"
      :expense="inviteExpense"
      :group="group"
      :user-id="userId"
      @close="inviteExpense = null"
    />

    <!-- Sheet: edit the group (name + icon) -->
    <BaseSheet
      v-if="editGroupOpen"
      :title="t('group.editSheetTitle')"
      :subtitle="t('group.editSheetSub')"
      @close="editGroupOpen = false"
    >
      <div class="form-label">{{ t('group.iconLabel') }}</div>
      <GroupIconPicker v-model="editGroupIcon" />

      <div class="form-label">{{ t('group.nameLabel') }}</div>
      <input
        v-model="editGroupName"
        class="form-input"
        type="text"
        :placeholder="t('group.groupNamePlaceholder')"
        @keyup.enter="saveGroup"
      />

      <button class="btn-primary" :disabled="!editGroupName.trim()" @click="saveGroup">
        {{ t('common.save') }}
      </button>
      <button class="btn-ghost" @click="editGroupOpen = false">{{ t('common.cancel') }}</button>
    </BaseSheet>

    <!-- Sheet: add a placeholder member (creator only) -->
    <BaseSheet
      v-if="showAddMember"
      :title="t('group.addMemberTitle')"
      :subtitle="t('group.addMemberSub')"
      @close="
        showAddMember = false;
        addMemberName = '';
      "
    >
      <div class="form-label">{{ t('group.firstNameLabel') }}</div>
      <input
        v-model="addMemberName"
        class="form-input"
        type="text"
        :placeholder="t('group.firstNamePlaceholder')"
        @keyup.enter="confirmAddMember"
      />

      <button
        class="btn-primary"
        :disabled="!addMemberName.trim() || addingMember"
        @click="confirmAddMember"
      >
        {{ addingMember ? t('group.adding') : t('common.add') }}
      </button>
      <button
        class="btn-ghost"
        @click="
          showAddMember = false;
          addMemberName = '';
        "
      >
        {{ t('common.cancel') }}
      </button>
    </BaseSheet>

    <!-- Sheet: edit an expense description -->
    <BaseSheet
      v-if="editExpense"
      :title="t('group.editExpenseTitle')"
      :subtitle="editExpenseSub"
      @close="closeEditExpense"
    >
      <div class="form-label">{{ t('group.descriptionLabel') }}</div>
      <input
        v-model="editExpenseDesc"
        class="form-input"
        type="text"
        :placeholder="t('group.expenseDescPlaceholder')"
        @keyup.enter="saveExpense"
      />

      <button class="btn-primary" :disabled="!editExpenseDesc.trim()" @click="saveExpense">
        {{ t('common.save') }}
      </button>
      <button class="btn-ghost" @click="closeEditExpense">{{ t('common.cancel') }}</button>
    </BaseSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Expense, GroupIcon, ShareableRoom } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { useI18n } from '../stores/i18n';
import { buildInviteUrl, buildInviteDeeplink } from '../utils/room';
import ExpenseCard from '../components/ExpenseCard.vue';
import { captureError } from '../utils/errors';
import { fetchRate, eurApprox } from '../utils/rate';
import InviteSheet from '../components/InviteSheet.vue';
import CreditorList from '../components/CreditorList.vue';
import BaseSheet from '../components/BaseSheet.vue';
import ScreenHeader from '../components/ScreenHeader.vue';
import GroupIconPicker from '../components/GroupIconPicker.vue';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';
import QrCodeIcon from '../assets/svg/qrCode.svg';
import DotsIcon from '../assets/svg/dots.svg';
import PlusIcon from '../assets/svg/plus.svg';
import CheckIcon from '../assets/svg/check.svg';
import NimiqIdenticon from '../components/NimiqIdenticon.vue';

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
    await router.replace({ name: 'home' });
    return;
  }
  // Refresh the group's expenses from Supabase on open.
  try {
    await store.refreshGroupExpenses(props.id);
  } catch (err) {
    captureError(err, 'GroupView.refreshGroupExpenses');
    toast.show(t('error.syncFailed'), 'error');
  }
  await fetchRate();
});

const monthLabel = computed(() =>
  group.value
    ? group.value.createdAt.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'fr-FR', {
        month: 'short',
        year: 'numeric',
      })
    : '',
);

const headerSub = computed(() => {
  const members = group.value?.members.length ?? 0;
  return `${t('group.membersCount', { count: members }, members)} · ${monthLabel.value}`;
});

function memberName(id: string): string {
  if (id === myMemberId.value) return t('group.you');
  return group.value?.members.find((member) => member.id === id)?.name ?? t('group.unknown');
}

function userShare(expenseId: string): number {
  const expense = expenses.value.find((entry) => entry.id === expenseId);
  return expense?.shares.find((share) => share.memberId === myMemberId.value)?.amount ?? 0;
}

function shareStatus(expenseId: string) {
  return store.myShareStatus(props.id, expenseId, userId.value);
}

// Real settlement progress (0..1) shown by the card's bar. For the payer, how
// much of the expense has been reimbursed; for a debtor, how much of their
// own share is paid.
function expenseProgress(expense: Expense): number {
  if (expense.paidBy === myMemberId.value) {
    return store.expenseSettledRatio(props.id, expense.id);
  }
  const status = shareStatus(expense.id);
  if (!status || status.share <= 0) return 0;
  return Math.max(0, Math.min(1, (status.share - status.open) / status.share));
}

// Click on an expense: pay my open share directly; otherwise (payer, settled,
// or no share) fall back to the invite sheet, as before.
function onSelectExpense(expense: Expense) {
  const status = shareStatus(expense.id);
  if (!status || status.settled) {
    inviteExpense.value = expense;
    return;
  }
  // Cap at the creditor's remaining debt: legacy unallocated payments reduce
  // the total owed without marking individual expenses settled.
  const debt = debts.value.find((entry) => entry.creditor.id === expense.paidBy);
  const payable = Math.min(status.open, debt?.remaining ?? 0);
  if (payable < 0.005) {
    inviteExpense.value = expense;
    return;
  }
  const payee = group.value?.members.find((member) => member.id === expense.paidBy);
  if (!payee?.address?.startsWith('NQ')) {
    toast.show(t('invite.toastNoAddress'), 'error');
    return;
  }
  if (expense.currency !== 'NIM') {
    toast.show(t('invite.toastNimOnly'), 'error');
    return;
  }
  const room: ShareableRoom = {
    id: expense.id,
    creatorId: payee.address,
    creatorName: payee.name,
    amount: payable,
    currency: 'NIM',
    reason: expense.description,
    maxParticipants: 1,
    allocations: [{ expenseId: expense.id, amount: payable }],
  };
  router.push({
    name: 'pay',
    query: { room: encodeURIComponent(JSON.stringify(room)), groupId: props.id },
  });
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

const editExpenseSub = computed(() => {
  const expense = editExpense.value;
  if (!expense) return '';
  return `${expense.amount.toFixed(2)} ${expense.currency} · ${t('group.paidByPrefix')} ${memberName(expense.paidBy)}`;
});

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
</script>

<style scoped>
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
  border: 1.5px dashed var(--text);
  color: var(--text);
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
  color: var(--text);
  font-weight: 500;
}

.qr-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--accent);
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
.tosettle-section {
  margin: 0 18px 14px;
  flex-shrink: 0;
}

.tosettle-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.tosettle-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
}

.tosettle-total {
  font-size: 12px;
  font-weight: 700;
  color: var(--red);
}

.credit-card {
  margin: 0 18px 14px;
  background: var(--green-bg);
  border: 1px solid var(--green-border);
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
  background: var(--green-bg);
  border: 1px solid var(--green-border);
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
  color: #fff;
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

/* Edit sheets: les labels gardent l'espacement d'origine */
.form-label {
  margin: 14px 0 10px;
}

.eur-approx {
  font-size: 11px;
  color: var(--text-mid);
  margin-top: 2px;
  font-weight: 600;
}
</style>
