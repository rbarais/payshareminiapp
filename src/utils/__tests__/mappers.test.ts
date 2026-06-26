import { describe, it, expect } from 'vitest';
import { rowToExpense, expenseToRow } from '../mappers';

describe('expense mapper', () => {
  it('maps row → Expense with Date', () => {
    const row = {
      id: 'e1', group_id: 'g1', description: 'Tapas', amount: 30, currency: 'NIM',
      paid_by: 'NQ_A', split: 'equal',
      shares: [{ memberId: 'NQ_A', weight: 0, amount: 15 }, { memberId: 'NQ_B', weight: 0, amount: 15 }],
      created_at: '2026-06-26T10:00:00.000Z',
    };
    const e = rowToExpense(row as any);
    expect(e.groupId).toBe('g1');
    expect(e.createdAt).toBeInstanceOf(Date);
    expect(e.shares).toHaveLength(2);
  });

  it('round-trips Expense → row → Expense', () => {
    const e = rowToExpense({
      id: 'e1', group_id: 'g1', description: 'x', amount: 10, currency: 'NIM',
      paid_by: 'NQ_A', split: 'fixed', shares: [], created_at: '2026-06-26T10:00:00.000Z',
    } as any);
    const back = rowToExpense(expenseToRow(e) as any);
    expect(back.id).toBe(e.id);
    expect(back.createdAt.toISOString()).toBe(e.createdAt.toISOString());
  });
});
