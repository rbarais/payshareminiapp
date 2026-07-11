import { describe, it, expect } from 'vitest';
import { buildActivityFeed } from '../history';
import type { Group, Expense, Settlement } from '../../types';

const ME = 'NQ00 ME00 0000 0000 0000 0000 0000 0000 0000';
const MARIE = 'NQ11 MARI E000 0000 0000 0000 0000 0000 0000';

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    name: 'Vacances Barcelone',
    icon: 'list',
    creatorId: ME,
    members: [
      { id: 'm-me', address: ME, name: 'Moi', joinedAt: new Date('2026-01-01') },
      { id: 'm-marie', address: MARIE, name: 'Marie', joinedAt: new Date('2026-01-01') },
    ],
    currencies: ['NIM'],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    groupId: 'g1',
    description: 'Courses',
    amount: 84,
    currency: 'NIM',
    paidBy: 'm-me',
    split: 'equal',
    shares: [
      { memberId: 'm-me', weight: 0, amount: 42 },
      { memberId: 'm-marie', weight: 0, amount: 42 },
    ],
    createdAt: new Date('2026-07-11T10:00:00Z'),
    ...overrides,
  };
}

function settlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: 'tx-abc',
    groupId: 'g1',
    fromId: ME,
    toId: MARIE,
    amount: 42.5,
    currency: 'NIM',
    allocations: [{ expenseId: 'e1', amount: 42.5 }],
    settledAt: new Date('2026-07-11T12:00:00Z'),
    ...overrides,
  };
}

describe('buildActivityFeed', () => {
  it('marks a settlement I sent, resolving the recipient name and settled expense', () => {
    const feed = buildActivityFeed([group()], [expense()], [settlement()], ME);
    const sent = feed.find((e) => e.kind === 'sent')!;
    expect(sent.counterpartyName).toBe('Marie');
    expect(sent.settledExpenses).toEqual(['Courses']);
    expect(sent.amount).toBe(42.5);
    expect(sent.txHash).toBe('tx-abc');
  });

  it('marks a settlement I received', () => {
    const s = settlement({ id: 'tx-in', fromId: MARIE, toId: ME });
    const feed = buildActivityFeed([group()], [expense()], [s], ME);
    const received = feed.find((e) => e.kind === 'received')!;
    expect(received.counterpartyName).toBe('Marie');
  });

  it('excludes settlements between two other members', () => {
    const s = settlement({ fromId: MARIE, toId: 'NQ99 OTHE R000 0000 0000 0000 0000 0000 0000' });
    const feed = buildActivityFeed([group()], [], [s], ME);
    expect(feed.filter((e) => e.kind !== 'expense')).toHaveLength(0);
  });

  it('falls back to a short address when the counterparty is not a known member', () => {
    const s = settlement({ toId: 'NQ99 OTHE R000 0000 0000 0000 0000 0000 0000' });
    const feed = buildActivityFeed([group()], [], [s], ME);
    const sent = feed.find((e) => e.kind === 'sent')!;
    expect(sent.counterpartyName).toMatch(/NQ99/);
  });

  it('includes an expense I paid and one where I only have a share', () => {
    const mine = expense({ id: 'paid', paidBy: 'm-me' });
    const theirs = expense({ id: 'share', paidBy: 'm-marie' });
    const feed = buildActivityFeed([group()], [mine, theirs], [], ME);
    const ids = feed.filter((e) => e.kind === 'expense').map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['paid', 'share']));
  });

  it('excludes an expense that does not concern me', () => {
    const other = expense({
      id: 'other',
      paidBy: 'm-marie',
      shares: [{ memberId: 'm-marie', weight: 0, amount: 84 }],
    });
    const feed = buildActivityFeed([group()], [other], [], ME);
    expect(feed.some((e) => e.id === 'other')).toBe(false);
  });

  it('leaves settledExpenses empty for a legacy settlement with no allocations', () => {
    const s = settlement({ allocations: [] });
    const feed = buildActivityFeed([group()], [expense()], [s], ME);
    expect(feed.find((e) => e.kind === 'sent')!.settledExpenses).toEqual([]);
  });

  it('nulls the txHash of an unconfirmed settlement', () => {
    const s = settlement({ id: 'unconfirmed_1720000000000' });
    const feed = buildActivityFeed([group()], [], [s], ME);
    expect(feed.find((e) => e.kind === 'sent')!.txHash).toBeNull();
  });

  it('sorts events most-recent first', () => {
    const older = expense({ id: 'old', createdAt: new Date('2026-07-10T09:00:00Z') });
    const feed = buildActivityFeed([group()], [older, expense()], [settlement()], ME);
    const times = feed.map((e) => e.date.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});
