import { reactive, computed, watch } from 'vue';
import type { Group, Expense, Member, SplitMode, ExpenseShare, GroupIcon } from '../types';
import {
  loadGroups,
  saveGroups,
  loadExpenses,
  saveExpenses,
} from '../utils/storage';
import { insertGroup, insertExpense, fetchMyGroups, fetchGroupExpenses } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────
// Store groupes & dépenses — source de vérité côté client (Phase 0).
//
// Singleton réactif (état au niveau module) persisté dans localStorage. En
// Phase 1bis, les actions seront doublées d'appels au backend ; l'API du
// store reste la même pour les vues.
// ─────────────────────────────────────────────────────────────────────────

interface State {
  groups: Group[];
  expenses: Expense[];
}

const state = reactive<State>({
  groups: loadGroups(),
  expenses: loadExpenses(),
});

// Persistance automatique à chaque mutation.
watch(() => state.groups, (g) => saveGroups(g), { deep: true });
watch(() => state.expenses, (e) => saveExpenses(e), { deep: true });

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Token d'invitation hex (16 octets) — même format que le default Postgres.
// Généré côté client pour que le créateur puisse inviter sans attendre un refresh.
function randomInviteToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Calcule les parts figées d'une dépense selon le mode de répartition.
// `entries` : un membre par participant, avec un poids interprété selon le mode
//   - 'equal'      → poids ignoré (parts égales)
//   - 'percentage' → poids = pourcentage (0..100)
//   - 'fixed'      → poids = montant fixe dans la devise
function computeShares(
  amount: number,
  mode: SplitMode,
  entries: { memberId: string; weight?: number }[],
): ExpenseShare[] {
  if (entries.length === 0) return [];

  if (mode === 'equal') {
    const each = round2(amount / entries.length);
    const shares = entries.map((e) => ({ memberId: e.memberId, weight: 0, amount: each }));
    // Réinjecte l'arrondi résiduel sur la dernière part pour que la somme = total.
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

  // 'fixed'
  return entries.map((e) => ({ memberId: e.memberId, weight: e.weight ?? 0, amount: e.weight ?? 0 }));
}

// Solde net d'un membre dans un groupe.
// > 0 : on lui doit (créditeur) · < 0 : il doit (débiteur).
function memberBalance(groupId: string, memberId: string): number {
  let net = 0;
  for (const exp of state.expenses) {
    if (exp.groupId !== groupId) continue;
    if (exp.paidBy === memberId) net += exp.amount;
    const share = exp.shares.find((s) => s.memberId === memberId);
    if (share) net -= share.amount;
  }
  return round2(net);
}

export function useGroupsStore() {
  return {
    // ── État ────────────────────────────────────────────────────────────
    groups: computed(() => state.groups),
    expenses: computed(() => state.expenses),

    // ── Lecture ─────────────────────────────────────────────────────────
    getGroup: (id: string) => state.groups.find((g) => g.id === id) ?? null,
    groupExpenses: (groupId: string) =>
      state.expenses
        .filter((e) => e.groupId === groupId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    memberBalance,
    // Solde net de l'utilisateur courant dans un groupe.
    groupBalanceForUser: (groupId: string, userId: string) => memberBalance(groupId, userId),
    // Solde net agrégé sur tous les groupes où l'utilisateur est membre.
    globalBalanceForUser: (userId: string) =>
      round2(
        state.groups
          .filter((g) => g.members.some((m) => m.id === userId))
          .reduce((sum, g) => sum + memberBalance(g.id, userId), 0),
      ),

    // ── Mutations groupes ────────────────────────────────────────────────
    async createGroup(params: {
      name: string;
      icon: GroupIcon;
      creatorId: string;
      creatorName: string;
      currencies?: string[];
    }): Promise<Group> {
      const now = new Date();
      const group: Group = {
        // uuid : la colonne groups.id de Supabase est de type uuid.
        id: crypto.randomUUID(),
        name: params.name,
        icon: params.icon,
        creatorId: params.creatorId,
        members: [{ id: params.creatorId, name: params.creatorName, joinedAt: now }],
        currencies: params.currencies?.length ? params.currencies : ['NIM'],
        createdAt: now,
        inviteToken: randomInviteToken(),
      };
      await insertGroup(group);     // backend d'abord
      state.groups.push(group);     // puis cache
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
      // Supprime aussi les dépenses orphelines.
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

    // ── Mutations dépenses ───────────────────────────────────────────────
    async addExpense(params: {
      groupId: string;
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      split: SplitMode;
      // Un membre par participant ; weight interprété selon `split`.
      participants: { memberId: string; weight?: number }[];
    }): Promise<Expense> {
      const expense: Expense = {
        // uuid : la colonne expenses.id de Supabase est de type uuid.
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
      await insertExpense(expense);   // backend d'abord
      state.expenses.push(expense);   // puis cache
      return expense;
    },

    // Met à jour une dépense existante. La description est librement éditable ;
    // les autres champs (montant/répartition) restent figés pour préserver les
    // parts déjà calculées (une refonte des parts passe par une nouvelle dépense).
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

    // ── Synchronisation Supabase ──────────────────────────────────────────
    async refreshGroups(): Promise<void> {
      const groups = await fetchMyGroups();
      state.groups.splice(0, state.groups.length, ...groups);
    },
    async refreshGroupExpenses(groupId: string): Promise<void> {
      const expenses = await fetchGroupExpenses(groupId);
      const others = state.expenses.filter((e) => e.groupId !== groupId);
      state.expenses.splice(0, state.expenses.length, ...others, ...expenses);
    },

    // Exposé pour les écrans de saisie (prévisualisation des parts avant validation).
    computeShares,
  };
}
