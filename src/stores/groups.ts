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

// Solde net d'un membre dans un groupe.
// memberId = UUID stable du membre (pour les dépenses).
// memberAddress = adresse Nimiq du membre (pour les settlements qui sont vérifiés on-chain).
function memberBalance(groupId: string, memberId: string, memberAddress?: string): number {
  let net = 0;
  for (const exp of state.expenses) {
    if (exp.groupId !== groupId) continue;
    if (exp.paidBy === memberId) net += exp.amount;
    const share = exp.shares.find((s) => s.memberId === memberId);
    if (share) net -= share.amount;
  }
  // Les settlements utilisent les adresses Nimiq (vérification on-chain).
  const addr = memberAddress ?? memberId;
  for (const s of state.settlements) {
    if (s.groupId !== groupId) continue;
    if (s.fromId === addr) net += s.amount;
    if (s.toId === addr) net -= s.amount;
  }
  return round2(net);
}

// Retourne l'UUID du membre courant dans un groupe à partir de son adresse Nimiq.
function findMemberByAddress(groupId: string, nimiqAddress: string): Member | undefined {
  return state.groups.find((g) => g.id === groupId)?.members.find((m) => m.address === nimiqAddress);
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

    memberBalance,

    // Solde de l'utilisateur courant dans un groupe, via son adresse Nimiq.
    groupBalanceForUser: (groupId: string, nimiqAddress: string) => {
      const member = findMemberByAddress(groupId, nimiqAddress);
      if (!member) return 0;
      return memberBalance(groupId, member.id, nimiqAddress);
    },

    // Solde global agrégé sur tous les groupes.
    globalBalanceForUser: (nimiqAddress: string) =>
      round2(
        state.groups
          .filter((g) => g.members.some((m) => m.address === nimiqAddress))
          .reduce((sum, g) => {
            const member = g.members.find((m) => m.address === nimiqAddress);
            return sum + (member ? memberBalance(g.id, member.id, nimiqAddress) : 0);
          }, 0),
      ),

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
