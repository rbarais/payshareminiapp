import { getStoredJwt, setStoredJwt } from './auth';
import type {
  Group,
  Expense,
  Settlement,
  Member,
  SerializedMember,
  SerializedGroup,
  SerializedExpense,
  SerializedSettlement,
} from '../types';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = getStoredJwt();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    setStoredJwt(null);
    throw new Error('Session expirée'); // user-facing message (kept in French)
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function mapMember(member: SerializedMember): Member {
  return {
    id: member.id,
    address: member.address ?? undefined,
    name: member.name,
    joinedAt: new Date(member.joinedAt),
  };
}

export async function fetchMyGroups(): Promise<Group[]> {
  const groups = await apiFetch<SerializedGroup[]>('/api/groups');
  return groups.map((group) => ({
    ...group,
    createdAt: new Date(group.createdAt),
    members: (group.members ?? []).map(mapMember),
  }));
}

export async function fetchGroupExpenses(groupId: string): Promise<Expense[]> {
  const expenses = await apiFetch<SerializedExpense[]>(`/api/groups/${groupId}/expenses`);
  return expenses.map((expense) => ({ ...expense, createdAt: new Date(expense.createdAt) }));
}

export async function insertGroup(
  group: Group,
  creator: { address: string; name: string },
): Promise<{ members: Member[] }> {
  const res = await apiFetch<{ members: SerializedMember[] }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({
      ...group,
      members: [{ address: creator.address, name: creator.name }],
    }),
  });
  return { members: (res?.members ?? []).map(mapMember) };
}

export async function insertExpense(expense: Expense): Promise<void> {
  await apiFetch<void>(`/api/groups/${expense.groupId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

export async function addPlaceholderMember(groupId: string, name: string): Promise<Member> {
  const member = await apiFetch<SerializedMember>(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return mapMember(member);
}

export async function fetchJoinPreview(
  groupId: string,
  token: string,
): Promise<{ placeholders: { id: string; name: string }[] }> {
  return apiFetch(
    `/api/join/preview?g=${encodeURIComponent(groupId)}&t=${encodeURIComponent(token)}`,
  );
}

export async function joinGroup(
  groupId: string,
  token: string,
  options: { placeholderId: string } | { name: string },
): Promise<{ name: string; icon: string }> {
  return apiFetch<{ name: string; icon: string }>('/api/join', {
    method: 'POST',
    body: JSON.stringify({ groupId, token, ...options }),
  });
}

export async function fetchGroupSettlements(groupId: string): Promise<Settlement[]> {
  const rows = await apiFetch<SerializedSettlement[]>(`/api/groups/${groupId}/settlements`);
  return rows.map((row) => ({ ...row, settledAt: new Date(row.settledAt) }));
}

export async function insertSettlement(settlement: Settlement): Promise<void> {
  await apiFetch<void>(`/api/groups/${settlement.groupId}/settlements`, {
    method: 'POST',
    body: JSON.stringify({
      fromId: settlement.fromId,
      toId: settlement.toId,
      amount: settlement.amount,
      currency: settlement.currency,
      txHash: settlement.id,
      settledAt: settlement.settledAt.toISOString(),
    }),
  });
}
