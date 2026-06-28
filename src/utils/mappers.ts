import type {
  Group,
  Expense,
  Member,
  GroupIcon,
  SplitMode,
  ExpenseShare,
  MemberRow,
  GroupRow,
  ExpenseRow,
} from '../types';

export function rowToMember(row: MemberRow): Member {
  return { id: row.address, name: row.name, joinedAt: new Date(row.joined_at) };
}

export function rowToGroup(row: GroupRow, memberRows: MemberRow[]): Group {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as GroupIcon,
    creatorId: row.creator_addr,
    members: memberRows.map(rowToMember),
    currencies: row.currencies ?? ['NIM'],
    createdAt: new Date(row.created_at),
    inviteToken: row.invite_token,
  };
}

export function groupToRow(group: Group): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: group.id,
    name: group.name,
    icon: group.icon,
    creator_addr: group.creatorId,
    currencies: group.currencies,
  };
  if (group.inviteToken) row.invite_token = group.inviteToken;
  return row;
}

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    paidBy: row.paid_by,
    split: row.split as SplitMode,
    shares: (row.shares ?? []) as ExpenseShare[],
    createdAt: new Date(row.created_at),
  };
}

export function expenseToRow(expense: Expense): Record<string, unknown> {
  return {
    id: expense.id,
    group_id: expense.groupId,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    paid_by: expense.paidBy,
    split: expense.split,
    shares: expense.shares,
    created_at: expense.createdAt.toISOString(),
  };
}
