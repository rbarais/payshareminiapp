import { supabase, isSupabaseConfigured } from './supabase';

function assertConfigured() {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré (variables manquantes)');
}
import { rowToGroup, rowToExpense, groupToRow, expenseToRow } from './mappers';
import type { Group, Expense } from '../types';

export async function fetchMyGroups(): Promise<Group[]> {
  assertConfigured();
  const { data: groups, error } = await supabase.from('groups').select('*');
  if (error) throw error;
  const out: Group[] = [];
  for (const g of groups ?? []) {
    const { data: members } = await supabase.from('members').select('*').eq('group_id', g.id);
    out.push(rowToGroup(g, members ?? []));
  }
  return out;
}

export async function fetchGroupExpenses(groupId: string): Promise<Expense[]> {
  assertConfigured();
  const { data, error } = await supabase.from('expenses').select('*').eq('group_id', groupId);
  if (error) throw error;
  return (data ?? []).map(rowToExpense);
}

export async function insertGroup(g: Group): Promise<void> {
  assertConfigured();
  const { error: gErr } = await supabase.from('groups').insert(groupToRow(g));
  if (gErr) throw gErr;
  const { error: mErr } = await supabase.from('members').insert(
    g.members.map((m) => ({ group_id: g.id, address: m.id, name: m.name })),
  );
  if (mErr) throw mErr;
}

export async function insertExpense(e: Expense): Promise<void> {
  assertConfigured();
  const { error } = await supabase.from('expenses').insert(expenseToRow(e));
  if (error) throw error;
}

export async function joinGroup(groupId: string, token: string, name: string): Promise<{ name: string; icon: string }> {
  assertConfigured();
  const { data, error } = await supabase.rpc('join_group', { p_group_id: groupId, p_token: token, p_name: name });
  if (error) throw error;
  return data as { name: string; icon: string };
}
