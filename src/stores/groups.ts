import { reactive, computed, watch } from 'vue';
import type { Group, Expense, Member, Settlement, SplitMode, ExpenseShare, GroupIcon } from '../types';
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
  addPlaceholderMember,
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

watch(() => state.groups, (g) => saveGroups(g), { deep: true });
watch(() => state.expenses, (e) => saveExpenses(e), { deep: true });
watch(() => state.settlements, (s) => saveSettlements(s), { deep: true });

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function randomInviteToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function computeShares(
  amount: number,
  mode: SplitMode,
  entries: { memberId: string; weight?: number }[],
): ExpenseShare[] {
  if (entries.length === 0) return [];

  if (mode === 'equal') {
    const each = round2(amount / entries.length);
    const shares = entries.map((e) => ({ memberId: e.memberId, weight: 0, amount: each }));
    const diff = round2(amount - each * entries.length);
    if (diff !== 0) shares[shares.length - 1].amount = round2(shares[shares.length - 1].amount + diff);
    return shares;
  }

  if (mode === 'percentage') {
    return entries.map((e) => {
      const pct = e.weight ?? 0;
      return { memberId: e.memberId, weight: pct, amount: round2((amount * pct) / 100) };
    });
  }

  return entries.map((e) => ({ memberId: e.memberId, weight: e.weight ?? 0, amount: e.weight ?? 0 }));
}

// Retourne l'UUID du membre courant dans un groupe à partir de son adresse Nimiq.
function findMemberByAddress(groupId: string, nimiqAddress: string): Member | undefined {
  return state.groups.find((g) => g.id === groupId)?.members.find((m) => m.address === nimiqAddress);
}

// Une dette brute de l'utilisateur courant envers un créancier (le membre qui a payé).
// owed = somme de mes parts sur les dépenses de ce créancier ; paid = règlements
// on-chain déjà envoyés à ce créancier ; remaining = ce qui reste à régler.
export interface CreditorDebt {
  creditor: Member;
  expenses: { expense: Expense; share: number }[];
  owed: number;
  paid: number;
  remaining: number;
}

// Dettes brutes (sans compensation) de l'utilisateur, groupées par créancier.
// memberId = UUID du membre courant ; nimiqAddress = son adresse (pour les settlements).
function grossDebtsForMember(groupId: string, memberId: string, nimiqAddress?: string): CreditorDebt[] {
  const group = state.groups.find((g) => g.id === groupId);
  if (!group || !memberId) return [];
  const myAddr = nimiqAddress ?? memberId;

  // Regroupe mes parts par payeur (en excluant les dépenses que j'ai payées).
  const byCreditor = new Map<string, { expense: Expense; share: number }[]>();
  for (const exp of state.expenses) {
    if (exp.groupId !== groupId || exp.paidBy === memberId) continue;
    const share = exp.shares.find((s) => s.memberId === memberId)?.amount ?? 0;
    if (share <= 0) continue;
    const list = byCreditor.get(exp.paidBy) ?? [];
    list.push({ expense: exp, share });
    byCreditor.set(exp.paidBy, list);
  }

  const debts: CreditorDebt[] = [];
  for (const [creditorId, expenses] of byCreditor) {
    const creditor = group.members.find((m) => m.id === creditorId);
    if (!creditor) continue;
    const owed = round2(expenses.reduce((s, e) => s + e.share, 0));
    // Règlements déjà envoyés à ce créancier (settlements indexés par adresse Nimiq).
    let paid = 0;
    if (creditor.address) {
      for (const s of state.settlements) {
        if (s.groupId === groupId && s.fromId === myAddr && s.toId === creditor.address) paid += s.amount;
      }
    }
    const remaining = round2(Math.max(0, owed - paid));
    if (remaining < 0.005) continue;
    debts.push({ creditor, expenses, owed, paid: round2(paid), remaining });
  }
  return debts;
}

// Ce que les autres me doivent (brut) : leurs parts sur MES dépenses, moins les
// règlements déjà reçus. Clampé à ≥ 0.
function grossCreditForMember(groupId: string, memberId: string, nimiqAddress?: string): number {
  if (!memberId) return 0;
  const myAddr = nimiqAddress ?? memberId;
  let credit = 0;
  for (const exp of state.expenses) {
    if (exp.groupId !== groupId || exp.paidBy !== memberId) continue;
    for (const s of exp.shares) {
      if (s.memberId !== memberId) credit += s.amount;
    }
  }
  for (const s of state.settlements) {
    if (s.groupId === groupId && s.toId === myAddr) credit -= s.amount;
  }
  return round2(Math.max(0, credit));
}

export function useGroupsStore() {
  return {
    groups: computed(() => state.groups),
    expenses: computed(() => state.expenses),
    syncing: computed(() => state.syncing),

    getGroup: (id: string) => state.groups.find((g) => g.id === id) ?? null,
    groupExpenses: (groupId: string) =>
      state.expenses
        .filter((e) => e.groupId === groupId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),

    // Dettes brutes de l'utilisateur (par adresse Nimiq), groupées par créancier.
    grossDebtsForUser: (groupId: string, nimiqAddress: string): CreditorDebt[] => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return [];
      return grossDebtsForMember(groupId, member.id, nimiqAddress);
    },

    // Total brut que l'utilisateur doit dans un groupe (somme des restes par créancier).
    grossDebtTotal: (groupId: string, nimiqAddress: string): number => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return 0;
      return round2(
        grossDebtsForMember(groupId, member.id, nimiqAddress).reduce((s, d) => s + d.remaining, 0),
      );
    },

    // Total brut qu'on doit à l'utilisateur dans un groupe.
    grossCreditForUser: (groupId: string, nimiqAddress: string): number => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return 0;
      return grossCreditForMember(groupId, member.id, nimiqAddress);
    },

    // UUID du membre courant dans un groupe (undefined si pas encore lié).
    myMemberId: (groupId: string, nimiqAddress: string): string =>
      findMemberByAddress(groupId, nimiqAddress)?.id ?? '',

    async createGroup(params: {
      name: string;
      icon: GroupIcon;
      creatorId: string;   // adresse Nimiq du créateur
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
      const created = await insertGroup(group, { address: params.creatorId, name: params.creatorName });
      group.members = created.members;
      state.groups.push(group);
      return group;
    },

    updateGroup(id: string, patch: Partial<Omit<Group, 'id' | 'createdAt'>>): Group | null {
      const group = state.groups.find((g) => g.id === id);
      if (!group) return null;
      Object.assign(group, patch);
      return group;
    },

    deleteGroup(id: string): void {
      const i = state.groups.findIndex((g) => g.id === id);
      if (i !== -1) state.groups.splice(i, 1);
      for (let j = state.expenses.length - 1; j >= 0; j--) {
        if (state.expenses[j].groupId === id) state.expenses.splice(j, 1);
      }
    },

    addMember(groupId: string, member: Omit<Member, 'joinedAt'>): Member | null {
      const group = state.groups.find((g) => g.id === groupId);
      if (!group) return null;
      if (group.members.some((m) => m.id === member.id)) {
        return group.members.find((m) => m.id === member.id)!;
      }
      const m: Member = { ...member, joinedAt: new Date() };
      group.members.push(m);
      return m;
    },

    // Ajoute un membre placeholder (sans adresse) — créateur uniquement.
    async addPlaceholderMember(groupId: string, name: string): Promise<Member> {
      const member = await addPlaceholderMember(groupId, name);
      const group = state.groups.find((g) => g.id === groupId);
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

    updateExpense(
      id: string,
      patch: Partial<Pick<Expense, 'description'>>,
    ): Expense | null {
      const expense = state.expenses.find((e) => e.id === id);
      if (!expense) return null;
      Object.assign(expense, patch);
      return expense;
    },

    deleteExpense(id: string): void {
      const i = state.expenses.findIndex((e) => e.id === id);
      if (i !== -1) state.expenses.splice(i, 1);
    },

    addSettlement(s: Settlement): void {
      if (state.settlements.some((existing) => existing.id === s.id)) return;
      state.settlements.push(s);
      insertSettlement(s).catch((err) => console.warn('settlement backend sync failed:', err));
    },

    async refreshAll(): Promise<void> {
      state.syncing = true;
      try {
        const groups = await fetchMyGroups();
        const [allExpenses, allSettlements] = await Promise.all([
          Promise.all(groups.map((g) => fetchGroupExpenses(g.id))),
          Promise.all(groups.map((g) => fetchGroupSettlements(g.id))),
        ]);
        state.groups = groups;
        state.expenses = allExpenses.flat();
        state.settlements = allSettlements.flat();
      } finally {
        state.syncing = false;
      }
    },

    async refreshGroupExpenses(groupId: string): Promise<void> {
      const [expenses, settlements] = await Promise.all([
        fetchGroupExpenses(groupId),
        fetchGroupSettlements(groupId),
      ]);
      state.expenses = [...state.expenses.filter((e) => e.groupId !== groupId), ...expenses];
      state.settlements = [...state.settlements.filter((s) => s.groupId !== groupId), ...settlements];
    },

    computeShares,
  };
}
