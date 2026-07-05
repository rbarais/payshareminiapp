import type {
  Group,
  Expense,
  Settlement,
  SerializedGroup,
  SerializedExpense,
  SerializedSettlement,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────
// Local persistence (localStorage).
//
// In Option B, localStorage acts as an offline cache: the source of truth for
// collaborative data will be the backend (Phase 1bis), and the blockchain for
// payments. For Phase 0 it is the store's primary storage.
// ─────────────────────────────────────────────────────────────────────────

const GROUPS_KEY = 'payshare_groups';
const EXPENSES_KEY = 'payshare_expenses';
const SETTLEMENTS_KEY = 'payshare_settlements';

// Reload a typed JSON array, re-hydrating dates from their string form.
function load<TStored, TResult>(key: string, reviveDates: (raw: TStored) => TResult): TResult[] {
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return (JSON.parse(stored) as TStored[]).map(reviveDates);
  } catch {
    return [];
  }
}

export function loadGroups(): Group[] {
  return load<SerializedGroup, Group>(GROUPS_KEY, (group) => ({
    ...group,
    createdAt: new Date(group.createdAt),
    members: (group.members ?? []).map((member) => ({
      ...member,
      joinedAt: new Date(member.joinedAt),
    })),
  }));
}

export function saveGroups(groups: Group[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function loadExpenses(): Expense[] {
  return load<SerializedExpense, Expense>(EXPENSES_KEY, (expense) => ({
    ...expense,
    createdAt: new Date(expense.createdAt),
  }));
}

export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function loadSettlements(): Settlement[] {
  return load<SerializedSettlement, Settlement>(SETTLEMENTS_KEY, (settlement) => ({
    ...settlement,
    allocations: settlement.allocations ?? [], // legacy cached settlements
    settledAt: new Date(settlement.settledAt),
  }));
}

export function saveSettlements(settlements: Settlement[]): void {
  localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements));
}

// Generate a unique prefixed id (e.g. generateId('group') → 'group_…').
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
