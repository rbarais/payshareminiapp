import { getStoredJwt, setStoredJwt } from './auth';
import type { Group, Expense, Settlement } from '../types';

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
    throw new Error('Session expirée');
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function fetchMyGroups(): Promise<Group[]> {
  const groups = await apiFetch<any[]>('/api/groups');
  return groups.map((g) => ({
    ...g,
    createdAt: new Date(g.createdAt),
    members: (g.members as any[]).map((m) => ({ ...m, joinedAt: new Date(m.joinedAt) })),
  }));
}

export async function fetchGroupExpenses(groupId: string): Promise<Expense[]> {
  const expenses = await apiFetch<any[]>(`/api/groups/${groupId}/expenses`);
  return expenses.map((e) => ({ ...e, createdAt: new Date(e.createdAt) }));
}

export async function insertGroup(g: Group): Promise<void> {
  await apiFetch<void>('/api/groups', {
    method: 'POST',
    body: JSON.stringify(g),
  });
}

export async function insertExpense(e: Expense): Promise<void> {
  await apiFetch<void>(`/api/groups/${e.groupId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(e),
  });
}

export async function joinGroup(
  groupId: string,
  token: string,
  name: string,
): Promise<{ name: string; icon: string }> {
  return apiFetch<{ name: string; icon: string }>('/api/join', {
    method: 'POST',
    body: JSON.stringify({ groupId, token, name }),
  });
}

export async function fetchGroupSettlements(groupId: string): Promise<Settlement[]> {
  const rows = await apiFetch<any[]>(`/api/groups/${groupId}/settlements`);
  return rows.map((r) => ({ ...r, settledAt: new Date(r.settledAt) }));
}

export async function insertSettlement(s: Settlement): Promise<void> {
  await apiFetch<void>(`/api/groups/${s.groupId}/settlements`, {
    method: 'POST',
    body: JSON.stringify({
      fromId: s.fromId,
      toId: s.toId,
      amount: s.amount,
      currency: s.currency,
      txHash: s.id,
      settledAt: s.settledAt.toISOString(),
    }),
  });
}
