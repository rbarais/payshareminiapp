import type { Group, Expense, Settlement } from '../types';
import { formatAddressShort } from './nimiq';

// A single entry in the notification bell. Structured data only — all text
// formatting and i18n happen in the view.
export type NotificationKind = 'received' | 'expenseShare' | 'memberJoined' | 'groupSettled';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  groupId: string;
  groupName: string;
  counterpartyName?: string; // received, expenseShare, memberJoined
  amount?: number; // received, expenseShare
  currency?: string; // received, expenseShare
  date: Date;
}

function normAddr(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

// Build the notification-worthy events concerning `myAddress`: payments
// received, expenses added by someone else that concern me, new members in my
// groups, and groups that just became fully settled. Sorted newest first.
export function buildNotifications(
  groups: Group[],
  expenses: Expense[],
  settlements: Settlement[],
  myAddress: string,
  isExpenseFullySettled: (groupId: string, expenseId: string) => boolean,
): NotificationItem[] {
  const me = normAddr(myAddress);
  const items: NotificationItem[] = [];

  for (const group of groups) {
    const myMember = group.members.find(
      (member) => member.address && normAddr(member.address) === me,
    );

    for (const settlement of settlements) {
      if (settlement.groupId !== group.id) continue;
      if (normAddr(settlement.toId) !== me) continue;
      const payer = group.members.find(
        (member) => member.address && normAddr(member.address) === normAddr(settlement.fromId),
      );
      items.push({
        id: `settlement-${settlement.id}`,
        kind: 'received',
        groupId: group.id,
        groupName: group.name,
        counterpartyName: payer?.name ?? formatAddressShort(settlement.fromId),
        amount: settlement.amount,
        currency: settlement.currency,
        date: settlement.settledAt,
      });
    }

    if (myMember) {
      for (const expense of expenses) {
        if (expense.groupId !== group.id) continue;
        if (expense.paidBy === myMember.id) continue;
        const myShare = expense.shares.find((share) => share.memberId === myMember.id)?.amount ?? 0;
        if (myShare <= 0) continue;
        const payer = group.members.find((member) => member.id === expense.paidBy);
        items.push({
          id: `expense-${expense.id}`,
          kind: 'expenseShare',
          groupId: group.id,
          groupName: group.name,
          counterpartyName: payer?.name ?? '',
          amount: expense.amount,
          currency: expense.currency,
          date: expense.createdAt,
        });
      }
    }

    for (const member of group.members) {
      if (member.address && normAddr(member.address) === me) continue;
      items.push({
        id: `member-${member.id}`,
        kind: 'memberJoined',
        groupId: group.id,
        groupName: group.name,
        counterpartyName: member.name,
        date: member.joinedAt,
      });
    }

    const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
    const groupSettlements = settlements.filter((settlement) => settlement.groupId === group.id);
    if (groupExpenses.length > 0 && groupSettlements.length > 0) {
      const allSettled = groupExpenses.every((expense) =>
        isExpenseFullySettled(group.id, expense.id),
      );
      if (allSettled) {
        const lastSettlement = [...groupSettlements].sort(
          (first, second) => second.settledAt.getTime() - first.settledAt.getTime(),
        )[0];
        items.push({
          id: `settled-${group.id}`,
          kind: 'groupSettled',
          groupId: group.id,
          groupName: group.name,
          date: lastSettlement.settledAt,
        });
      }
    }
  }

  items.sort((first, second) => second.date.getTime() - first.date.getTime());
  return items;
}
