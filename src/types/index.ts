// ─────────────────────────────────────────────────────────────────────────
// PayShare data model (Phase 0 — Option B: synchronized groups)
//
// A persistent Group holds Members and several Expenses. Net balances are
// derived from the expenses (who paid what, who owes how much).
// The blockchain stays the source of truth for actual payments.
// ─────────────────────────────────────────────────────────────────────────

// Group icon/category (repris des maquettes/proto : 12 catégories).
// Les 4 premières valeurs restent inchangées pour les groupes déjà stockés.
export type GroupIcon =
  | 'person'
  | 'home'
  | 'car'
  | 'list'
  | 'food'
  | 'sport'
  | 'shopping'
  | 'travel'
  | 'beach'
  | 'birthday'
  | 'work'
  | 'cafe';

// A group member — identified by a stable UUID (DB primary key).
// A placeholder has no Nimiq address yet (it has not joined yet).
export interface Member {
  id: string; // stable UUID (never the Nimiq address)
  address?: string; // Nimiq address — absent while the placeholder is unclaimed
  name: string;
  joinedAt: Date;
}

// Split mode of an expense (see Notion: equal / percentage / fixed amount)
export type SplitMode = 'equal' | 'percentage' | 'fixed';

// A member's share of an expense.
export interface ExpenseShare {
  memberId: string;
  // Interpretation depends on the expense split mode:
  //  - 'equal'      → ignored (split evenly across the listed members)
  //  - 'percentage' → percentage 0..100
  //  - 'fixed'      → fixed amount in the expense currency
  weight: number;
  // Effective amount owed by this member, frozen at creation (expense currency).
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number; // total amount
  currency: string; // NIM, ETH, USDT, EUR…
  paidBy: string; // id of the paying member
  split: SplitMode;
  shares: ExpenseShare[]; // one entry per member involved
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  icon: GroupIcon;
  creatorId: string; // Nimiq address of the creator
  members: Member[];
  currencies: string[]; // accepted reimbursement currencies (NIM by default)
  createdAt: Date;
  inviteToken?: string; // invite token (present when loaded from Supabase)
}

// ─────────────────────────────────────────────────────────────────────────
// Data encoded in the payment QR / link — a shareable subset of an expense.
// Used by PayView / QRScanner for on-chain settlement.
// Will be wired to the Expense model during the invite flow (Phase 4).
// ─────────────────────────────────────────────────────────────────────────

// One expense share (partially) covered by a settlement.
export interface SettlementAllocation {
  expenseId: string;
  amount: number;
}

// On-chain settlement of a net balance within a group.
export interface Settlement {
  id: string; // on-chain transaction hash
  groupId: string;
  fromId: string; // debtor address (the one who paid)
  toId: string; // creditor address (the one who received)
  amount: number;
  currency: string;
  // Expense shares this payment settles. Empty = legacy unallocated payment,
  // deducted from the per-creditor total only (never linked back to expenses).
  allocations: SettlementAllocation[];
  settledAt: Date;
}

export interface ShareableRoom {
  id: string;
  creatorId: string;
  creatorName: string;
  amount: number;
  currency: string;
  reason: string;
  maxParticipants: number;
  // Present when the payment settles identified group-expense shares.
  allocations?: SettlementAllocation[];
}

// ─────────────────────────────────────────────────────────────────────────
// Serialized shapes — domain objects with their Date fields encoded as ISO
// strings, as they travel over the API (camelCase) or sit in localStorage.
// ─────────────────────────────────────────────────────────────────────────

export type SerializedMember = Omit<Member, 'joinedAt'> & { joinedAt: string };
export type SerializedGroup = Omit<Group, 'createdAt' | 'members'> & {
  createdAt: string;
  members?: SerializedMember[];
};
export type SerializedExpense = Omit<Expense, 'createdAt'> & { createdAt: string };
export type SerializedSettlement = Omit<Settlement, 'settledAt'> & { settledAt: string };

// ─────────────────────────────────────────────────────────────────────────
// Database row shapes (snake_case) as returned by the Postgres/Supabase tables.
// Used by the server-side row mappers.
// ─────────────────────────────────────────────────────────────────────────

export interface MemberRow {
  id: string;
  group_id: string;
  address: string;
  name: string;
  joined_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  icon: string;
  creator_addr: string;
  currencies: string[] | null;
  invite_token: string;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  group_id: string;
  description: string;
  amount: number | string;
  currency: string;
  paid_by: string;
  split: string;
  shares: ExpenseShare[] | null;
  created_at: string;
}
