import { reactive, computed, watch } from 'vue';
import type {
  Group,
  Expense,
  Member,
  Settlement,
  SplitMode,
  ExpenseShare,
  GroupIcon,
} from '../types';
import {
  loadGroups,
  saveGroups,
  loadExpenses,
  saveExpenses,
  loadSettlements,
  saveSettlements,
} from '../utils/storage';
import {
  insertGroup,
  insertExpense,
  insertSettlement,
  fetchMyGroups,
  fetchGroupExpenses,
  fetchGroupSettlements,
  fetchGroupMembers,
  addPlaceholderMember,
  fetchAllSettlements,
} from '../utils/api';

interface State {
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  syncing: boolean;
}

const state = reactive<State>({
  groups: loadGroups(),
  expenses: loadExpenses(),
  settlements: loadSettlements(),
  syncing: false,
});

watch(
  () => state.groups,
  (groups) => saveGroups(groups),
  { deep: true },
);
watch(
  () => state.expenses,
  (expenses) => saveExpenses(expenses),
  { deep: true },
);
watch(
  () => state.settlements,
  (settlements) => saveSettlements(settlements),
  { deep: true },
);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function randomInviteToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function computeShares(
  amount: number,
  mode: SplitMode,
  entries: { memberId: string; weight?: number }[],
): ExpenseShare[] {
  if (entries.length === 0) return [];

  if (mode === 'equal') {
    const each = round2(amount / entries.length);
    const shares = entries.map((entry) => ({ memberId: entry.memberId, weight: 0, amount: each }));
    const diff = round2(amount - each * entries.length);
    if (diff !== 0) {
      shares[shares.length - 1].amount = round2(shares[shares.length - 1].amount + diff);
    }
    return shares;
  }

  if (mode === 'percentage') {
    return entries.map((entry) => {
      const percentage = entry.weight ?? 0;
      return {
        memberId: entry.memberId,
        weight: percentage,
        amount: round2((amount * percentage) / 100),
      };
    });
  }

  return entries.map((entry) => ({
    memberId: entry.memberId,
    weight: entry.weight ?? 0,
    amount: entry.weight ?? 0,
  }));
}

function normAddr(a: string): string {
  return a.replace(/\s/g, '').toUpperCase();
}

// Return the current member's UUID in a group from their Nimiq address.
function findMemberByAddress(groupId: string, nimiqAddress: string): Member | undefined {
  const normalized = normAddr(nimiqAddress);
  return state.groups
    .find((group) => group.id === groupId)
    ?.members.find((member) => member.address && normAddr(member.address) === normalized);
}

// A gross debt of the current user toward a creditor (the member who paid).
// Each expense item carries its own open/settled state, derived from the
// settlement allocations.
export interface CreditorDebtItem {
  expense: Expense;
  share: number; // my frozen share on this expense
  open: number; // share minus allocated payments (≥ 0)
  settled: boolean; // open < 0.005
  txHash: string | null; // settlement that completed this share, when settled
}

export interface CreditorDebt {
  creditor: Member;
  expenses: CreditorDebtItem[];
  owed: number;
  paid: number;
  remaining: number;
}

// Per-expense totals allocated by the member's settlements in a group.
// txHash keeps the last settlement that touched the share (proof reference).
function allocationIndex(
  groupId: string,
  fromAddress: string,
): Map<string, { allocated: number; txHash: string }> {
  const index = new Map<string, { allocated: number; txHash: string }>();
  for (const settlement of state.settlements) {
    if (settlement.groupId !== groupId || settlement.fromId !== fromAddress) continue;
    for (const allocation of settlement.allocations) {
      const entry = index.get(allocation.expenseId) ?? { allocated: 0, txHash: settlement.id };
      entry.allocated = round2(entry.allocated + allocation.amount);
      entry.txHash = settlement.id;
      index.set(allocation.expenseId, entry);
    }
  }
  return index;
}

// Spread a lump-sum "legacy" settlement (paid via the per-creditor "pay all"
// button, with no per-expense allocations) across a creditor's still-open
// expenses, oldest first, marking each settled once fully covered.
function distributeLegacy(
  items: CreditorDebtItem[],
  legacyPaid: number,
  legacyTx: string | null,
): void {
  let remaining = legacyPaid;
  if (remaining < 0.005) return;
  const ordered = [...items].sort(
    (a, b) => a.expense.createdAt.getTime() - b.expense.createdAt.getTime(),
  );
  for (const item of ordered) {
    if (remaining < 0.005) break;
    if (item.open < 0.005) continue;
    const applied = Math.min(item.open, remaining);
    item.open = round2(item.open - applied);
    remaining = round2(remaining - applied);
    if (item.open < 0.005) {
      item.settled = true;
      if (item.txHash == null) item.txHash = legacyTx;
    }
  }
}

// Full per-creditor breakdown of what the user owes, including creditors whose
// debt is fully settled (callers filter as needed). Per-expense open/settled
// reflect BOTH explicit allocations and legacy (unallocated) payments.
// memberId = current member UUID; nimiqAddress = their address (for settlements).
function creditorBreakdown(
  groupId: string,
  memberId: string,
  nimiqAddress?: string,
): CreditorDebt[] {
  const group = state.groups.find((group) => group.id === groupId);
  if (!group || !memberId) return [];
  const myAddress = nimiqAddress ?? memberId;

  // Group my shares by payer (excluding the expenses I paid myself).
  const byCreditor = new Map<string, { expense: Expense; share: number }[]>();
  for (const expense of state.expenses) {
    if (expense.groupId !== groupId || expense.paidBy === memberId) continue;
    const share = expense.shares.find((entry) => entry.memberId === memberId)?.amount ?? 0;
    if (share <= 0) continue;
    const list = byCreditor.get(expense.paidBy) ?? [];
    list.push({ expense, share });
    byCreditor.set(expense.paidBy, list);
  }

  const allocated = allocationIndex(groupId, myAddress);
  const debts: CreditorDebt[] = [];
  for (const [creditorId, items] of byCreditor) {
    const creditor = group.members.find((member) => member.id === creditorId);
    if (!creditor) continue;
    const detailed: CreditorDebtItem[] = items.map(({ expense, share }) => {
      const entry = allocated.get(expense.id);
      const open = round2(Math.max(0, share - (entry?.allocated ?? 0)));
      const settled = open < 0.005;
      return { expense, share, open, settled, txHash: settled ? (entry?.txHash ?? null) : null };
    });

    // Legacy settlements (no allocations): spread them across the still-open
    // expenses so the per-expense view stays consistent with the total.
    let legacyPaid = 0;
    let legacyTx: string | null = null;
    if (creditor.address) {
      for (const settlement of state.settlements) {
        if (
          settlement.groupId === groupId &&
          settlement.fromId === myAddress &&
          settlement.toId === creditor.address &&
          settlement.allocations.length === 0
        ) {
          legacyPaid = round2(legacyPaid + settlement.amount);
          legacyTx = settlement.id;
        }
      }
    }
    distributeLegacy(detailed, legacyPaid, legacyTx);

    const owed = round2(detailed.reduce((sum, item) => sum + item.share, 0));
    const remaining = round2(detailed.reduce((sum, item) => sum + item.open, 0));
    debts.push({
      creditor,
      expenses: detailed,
      owed,
      paid: round2(owed - remaining),
      remaining,
    });
  }
  return debts;
}

// Gross debts (no netting) of the user, grouped by creditor. Fully-settled
// creditors are dropped.
function grossDebtsForMember(
  groupId: string,
  memberId: string,
  nimiqAddress?: string,
): CreditorDebt[] {
  return creditorBreakdown(groupId, memberId, nimiqAddress).filter(
    (debt) => debt.remaining >= 0.005,
  );
}

// What others owe me (gross): their shares on MY expenses, minus settlements
// already received. Clamped to ≥ 0.
function grossCreditForMember(groupId: string, memberId: string, nimiqAddress?: string): number {
  if (!memberId) return 0;
  const myAddress = nimiqAddress ?? memberId;
  let credit = 0;
  for (const expense of state.expenses) {
    if (expense.groupId !== groupId || expense.paidBy !== memberId) continue;
    for (const share of expense.shares) {
      if (share.memberId !== memberId) credit += share.amount;
    }
  }
  for (const settlement of state.settlements) {
    if (settlement.groupId === groupId && settlement.toId === myAddress) {
      credit -= settlement.amount;
    }
  }
  return round2(Math.max(0, credit));
}

export function useGroupsStore() {
  return {
    groups: computed(() => state.groups),
    expenses: computed(() => state.expenses),
    syncing: computed(() => state.syncing),

    getGroup: (id: string) => state.groups.find((group) => group.id === id) ?? null,
    groupExpenses: (groupId: string) =>
      state.expenses
        .filter((expense) => expense.groupId === groupId)
        .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime()),

    // Gross debts of the user (by Nimiq address), grouped by creditor.
    grossDebtsForUser: (groupId: string, nimiqAddress: string): CreditorDebt[] => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return [];
      return grossDebtsForMember(groupId, member.id, nimiqAddress);
    },

    // Total gross amount the user owes in a group (sum of remaining per creditor).
    grossDebtTotal: (groupId: string, nimiqAddress: string): number => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return 0;
      return round2(
        grossDebtsForMember(groupId, member.id, nimiqAddress).reduce(
          (sum, debt) => sum + debt.remaining,
          0,
        ),
      );
    },

    // Total gross amount owed to the user in a group.
    grossCreditForUser: (groupId: string, nimiqAddress: string): number => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return 0;
      return grossCreditForMember(groupId, member.id, nimiqAddress);
    },

    // Current member UUID in a group (empty string if not linked yet).
    myMemberId: (groupId: string, nimiqAddress: string): string =>
      findMemberByAddress(groupId, nimiqAddress)?.id ?? '',

    // Open/settled state of the current user's share on one expense.
    // null when not a member, not a debtor, or payer of the expense.
    myShareStatus: (
      groupId: string,
      expenseId: string,
      nimiqAddress: string,
    ): { share: number; open: number; settled: boolean; txHash: string | null } | null => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return null;
      const expense = state.expenses.find(
        (entry) => entry.id === expenseId && entry.groupId === groupId,
      );
      if (!expense || expense.paidBy === member.id) return null;
      const share = expense.shares.find((entry) => entry.memberId === member.id)?.amount ?? 0;
      if (share <= 0) return null;
      // Reuse the per-creditor breakdown so legacy (unallocated) payments settle
      // individual expenses the same way they do in the creditor list.
      const creditor = creditorBreakdown(groupId, member.id, nimiqAddress).find(
        (debt) => debt.creditor.id === expense.paidBy,
      );
      const item = creditor?.expenses.find((entry) => entry.expense.id === expenseId);
      if (!item) return { share, open: round2(share), settled: false, txHash: null };
      return { share: item.share, open: item.open, settled: item.settled, txHash: item.txHash };
    },

    // True when every debtor's share on an expense is fully settled (nobody
    // owes anything on it anymore) — used to disable interaction on the card.
    // A placeholder payer/debtor (no Nimiq address) can never be fully settled.
    expenseFullySettled: (groupId: string, expenseId: string): boolean => {
      const expense = state.expenses.find(
        (entry) => entry.id === expenseId && entry.groupId === groupId,
      );
      const group = state.groups.find((entry) => entry.id === groupId);
      if (!expense || !group) return false;
      const payer = group.members.find((member) => member.id === expense.paidBy);
      if (!payer?.address) return false;
      for (const share of expense.shares) {
        if (share.memberId === expense.paidBy || share.amount <= 0.005) continue;
        const debtor = group.members.find((member) => member.id === share.memberId);
        if (!debtor?.address) return false; // placeholder debtor can't have paid
        const creditor = creditorBreakdown(groupId, debtor.id, debtor.address).find(
          (debt) => debt.creditor.id === expense.paidBy,
        );
        const item = creditor?.expenses.find((entry) => entry.expense.id === expenseId);
        const open = item ? item.open : share.amount;
        if (open >= 0.005) return false;
      }
      return true;
    },

    // Fraction (0..1) of an expense reimbursed to the payer across all debtors —
    // real settlement progress. 1 when fully settled, 0 when nothing is paid.
    expenseSettledRatio: (groupId: string, expenseId: string): number => {
      const expense = state.expenses.find(
        (entry) => entry.id === expenseId && entry.groupId === groupId,
      );
      const group = state.groups.find((entry) => entry.id === groupId);
      if (!expense || !group) return 0;
      const payer = group.members.find((member) => member.id === expense.paidBy);
      let owed = 0;
      let open = 0;
      for (const share of expense.shares) {
        if (share.memberId === expense.paidBy || share.amount <= 0) continue;
        owed += share.amount;
        const debtor = group.members.find((member) => member.id === share.memberId);
        if (!debtor?.address || !payer?.address) {
          open += share.amount; // can't be settled on-chain (placeholder)
          continue;
        }
        const creditor = creditorBreakdown(groupId, debtor.id, debtor.address).find(
          (debt) => debt.creditor.id === expense.paidBy,
        );
        const item = creditor?.expenses.find((entry) => entry.expense.id === expenseId);
        open += item ? item.open : share.amount;
      }
      if (owed <= 0.005) return 1;
      return Math.max(0, Math.min(1, round2(owed - open) / owed));
    },

    async createGroup(params: {
      name: string;
      icon: GroupIcon;
      creatorId: string; // Nimiq address of the creator
      creatorName: string;
      currencies?: string[];
    }): Promise<Group> {
      const now = new Date();
      const group: Group = {
        id: crypto.randomUUID(),
        name: params.name,
        icon: params.icon,
        creatorId: params.creatorId,
        members: [],
        currencies: params.currencies?.length ? params.currencies : ['NIM'],
        createdAt: now,
        inviteToken: randomInviteToken(),
      };
      const created = await insertGroup(group, {
        address: params.creatorId,
        name: params.creatorName,
      });
      group.members = created.members;
      state.groups.push(group);
      return group;
    },

    updateGroup(id: string, patch: Partial<Omit<Group, 'id' | 'createdAt'>>): Group | null {
      const group = state.groups.find((group) => group.id === id);
      if (!group) return null;
      Object.assign(group, patch);
      return group;
    },

    deleteGroup(id: string): void {
      const groupIndex = state.groups.findIndex((group) => group.id === id);
      if (groupIndex !== -1) state.groups.splice(groupIndex, 1);
      for (let expenseIndex = state.expenses.length - 1; expenseIndex >= 0; expenseIndex--) {
        if (state.expenses[expenseIndex].groupId === id) state.expenses.splice(expenseIndex, 1);
      }
    },

    addMember(groupId: string, member: Omit<Member, 'joinedAt'>): Member | null {
      const group = state.groups.find((group) => group.id === groupId);
      if (!group) return null;
      if (group.members.some((existing) => existing.id === member.id)) {
        return group.members.find((existing) => existing.id === member.id)!;
      }
      const created: Member = { ...member, joinedAt: new Date() };
      group.members.push(created);
      return created;
    },

    // Add a placeholder member (without an address) — creator only.
    async addPlaceholderMember(groupId: string, name: string): Promise<Member> {
      const member = await addPlaceholderMember(groupId, name);
      const group = state.groups.find((group) => group.id === groupId);
      if (group) group.members.push(member);
      return member;
    },

    async addExpense(params: {
      groupId: string;
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      split: SplitMode;
      participants: { memberId: string; weight?: number }[];
    }): Promise<Expense> {
      const expense: Expense = {
        id: crypto.randomUUID(),
        groupId: params.groupId,
        description: params.description,
        amount: params.amount,
        currency: params.currency,
        paidBy: params.paidBy,
        split: params.split,
        shares: computeShares(params.amount, params.split, params.participants),
        createdAt: new Date(),
      };
      await insertExpense(expense);
      state.expenses.push(expense);
      return expense;
    },

    updateExpense(id: string, patch: Partial<Pick<Expense, 'description'>>): Expense | null {
      const expense = state.expenses.find((entry) => entry.id === id);
      if (!expense) return null;
      Object.assign(expense, patch);
      return expense;
    },

    deleteExpense(id: string): void {
      const index = state.expenses.findIndex((expense) => expense.id === id);
      if (index !== -1) state.expenses.splice(index, 1);
    },

    addSettlement(settlement: Settlement): Promise<void> {
      if (state.settlements.some((existing) => existing.id === settlement.id)) return Promise.resolve();
      state.settlements.push(settlement);
      return insertSettlement(settlement).catch((error) => {
        console.error('settlement backend sync failed:', error);
        const idx = state.settlements.findIndex((s) => s.id === settlement.id);
        if (idx !== -1) state.settlements.splice(idx, 1);
        throw error;
      });
    },

    async refreshAll(): Promise<void> {
      state.syncing = true;
      try {
        const groups = await fetchMyGroups();
        const [allExpenses, allSettlements] = await Promise.all([
          Promise.all(groups.map((group) => fetchGroupExpenses(group.id))),
          fetchAllSettlements(),
        ]);
        state.groups = groups;
        state.expenses = allExpenses.flat();
        state.settlements = allSettlements;
      } finally {
        state.syncing = false;
      }
    },

    async refreshGroupExpenses(groupId: string): Promise<void> {
      const [members, expenses, settlements] = await Promise.all([
        fetchGroupMembers(groupId),
        fetchGroupExpenses(groupId),
        fetchGroupSettlements(groupId),
      ]);
      const group = state.groups.find((g) => g.id === groupId);
      if (group) group.members = members;
      state.expenses = [
        ...state.expenses.filter((expense) => expense.groupId !== groupId),
        ...expenses,
      ];
      state.settlements = [
        ...state.settlements.filter((settlement) => settlement.groupId !== groupId),
        ...settlements,
      ];
    },

    computeShares,
  };
}
