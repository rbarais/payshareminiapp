import type { Group, Expense, Settlement } from '../types';
import { formatAddressShort } from './nimiq';

// A single entry in the user's activity feed. Structured data only — all text
// formatting and i18n happen in the view.
export type ActivityKind = 'sent' | 'received' | 'expense';

export interface ActivityEvent {
  id: string; // settlement tx hash or expense id
  kind: ActivityKind;
  counterpartyName?: string; // resolved contact name (sent/received)
  groupName: string;
  description?: string; // expense description (expense)
  settledExpenses?: string[]; // descriptions of the settled expenses (sent/received)
  amount: number;
  currency: string;
  txHash?: string | null; // null when the settlement is still unconfirmed
  date: Date;
}

function normAddr(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

// Build the unified feed of everything that concerns `myAddress`: settlements I
// sent or received, and expenses I paid or hold a share of. Sorted newest first.
export function buildActivityFeed(
  groups: Group[],
  expenses: Expense[],
  settlements: Settlement[],
  myAddress: string,
): ActivityEvent[] {
  const me = normAddr(myAddress);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));
  const events: ActivityEvent[] = [];

  // Settlements where I am the sender or the recipient.
  for (const settlement of settlements) {
    const isSent = normAddr(settlement.fromId) === me;
    const isReceived = normAddr(settlement.toId) === me;
    if (!isSent && !isReceived) continue;

    const group = groupById.get(settlement.groupId);
    const counterpartyAddr = isSent ? settlement.toId : settlement.fromId;
    const member = group?.members.find(
      (entry) => entry.address && normAddr(entry.address) === normAddr(counterpartyAddr),
    );
    const settledExpenses = settlement.allocations
      .map((allocation) => expenseById.get(allocation.expenseId)?.description)
      .filter((description): description is string => Boolean(description));

    events.push({
      id: settlement.id,
      kind: isSent ? 'sent' : 'received',
      counterpartyName: member?.name ?? formatAddressShort(counterpartyAddr),
      groupName: group?.name ?? '',
      settledExpenses,
      amount: settlement.amount,
      currency: settlement.currency,
      txHash: settlement.id.startsWith('unconfirmed_') ? null : settlement.id,
      date: settlement.settledAt,
    });
  }

  // Expenses I paid, or where I hold a share.
  for (const expense of expenses) {
    const group = groupById.get(expense.groupId);
    if (!group) continue;
    const myMember = group.members.find(
      (entry) => entry.address && normAddr(entry.address) === me,
    );
    if (!myMember) continue;
    const iPaid = expense.paidBy === myMember.id;
    const myShare = expense.shares.find((share) => share.memberId === myMember.id)?.amount ?? 0;
    if (!iPaid && myShare <= 0) continue;

    events.push({
      id: expense.id,
      kind: 'expense',
      groupName: group.name,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.createdAt,
    });
  }

  events.sort((first, second) => second.date.getTime() - first.date.getTime());
  return events;
}
