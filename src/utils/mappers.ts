import type { Group, Expense, Member, GroupIcon, SplitMode, ExpenseShare } from '../types';

export function rowToMember(m: any): Member {
  return { id: m.address, name: m.name, joinedAt: new Date(m.joined_at) };
}

export function rowToGroup(g: any, members: any[]): Group {
  return {
    id: g.id,
    name: g.name,
    icon: g.icon as GroupIcon,
    creatorId: g.creator_addr,
    members: members.map(rowToMember),
    currencies: g.currencies ?? ['NIM'],
    createdAt: new Date(g.created_at),
    inviteToken: g.invite_token,
  };
}

export function groupToRow(g: Group): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: g.id, name: g.name, icon: g.icon, creator_addr: g.creatorId, currencies: g.currencies,
  };
  if (g.inviteToken) row.invite_token = g.inviteToken;
  return row;
}

export function rowToExpense(e: any): Expense {
  return {
    id: e.id,
    groupId: e.group_id,
    description: e.description,
    amount: Number(e.amount),
    currency: e.currency,
    paidBy: e.paid_by,
    split: e.split as SplitMode,
    shares: (e.shares ?? []) as ExpenseShare[],
    createdAt: new Date(e.created_at),
  };
}

export function expenseToRow(e: Expense): Record<string, unknown> {
  return {
    id: e.id, group_id: e.groupId, description: e.description, amount: e.amount,
    currency: e.currency, paid_by: e.paidBy, split: e.split, shares: e.shares,
    created_at: e.createdAt.toISOString(),
  };
}
