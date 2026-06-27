import type { Group, Expense, Settlement } from '../types';

// ─────────────────────────────────────────────────────────────────────────
// Persistance locale (localStorage).
//
// En Option B, localStorage sert de cache offline : la source de vérité du
// métier collaboratif sera le backend (Phase 1bis), et celle des paiements
// la blockchain. Pour la Phase 0, c'est le stockage principal du store.
// ─────────────────────────────────────────────────────────────────────────

const GROUPS_KEY = 'payshare_groups';
const EXPENSES_KEY = 'payshare_expenses';
const SETTLEMENTS_KEY = 'payshare_settlements';

// Recharge un tableau JSON typé, en re-hydratant les dates depuis leurs strings.
function load<T>(key: string, reviveDates: (raw: any) => T): T[] {
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return (JSON.parse(stored) as any[]).map(reviveDates);
  } catch {
    return [];
  }
}

export function loadGroups(): Group[] {
  return load<Group>(GROUPS_KEY, (g) => ({
    ...g,
    createdAt: new Date(g.createdAt),
    members: (g.members ?? []).map((m: any) => ({ ...m, joinedAt: new Date(m.joinedAt) })),
  }));
}

export function saveGroups(groups: Group[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function loadExpenses(): Expense[] {
  return load<Expense>(EXPENSES_KEY, (e) => ({ ...e, createdAt: new Date(e.createdAt) }));
}

export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function loadSettlements(): Settlement[] {
  return load<Settlement>(SETTLEMENTS_KEY, (s) => ({ ...s, settledAt: new Date(s.settledAt) }));
}

export function saveSettlements(settlements: Settlement[]): void {
  localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements));
}

// Génère un id unique préfixé (ex. generateId('group') → 'group_…').
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
