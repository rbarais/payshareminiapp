import { describe, it, expect } from 'vitest';
import { buildNotifications } from '../notifications';
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
    paidBy: 'm-marie',
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
    fromId: MARIE,
    toId: ME,
    amount: 42.5,
    currency: 'NIM',
    allocations: [{ expenseId: 'e1', amount: 42.5 }],
    settledAt: new Date('2026-07-11T12:00:00Z'),
    ...overrides,
  };
}

const alwaysSettled = () => true;
const neverSettled = () => false;

describe('buildNotifications', () => {
  it('flags a settlement I received, resolving the payer name', () => {
    const items = buildNotifications([group()], [], [settlement()], ME, neverSettled);
    const received = items.find((item) => item.kind === 'received')!;
    expect(received.counterpartyName).toBe('Marie');
    expect(received.amount).toBe(42.5);
    expect(received.groupName).toBe('Vacances Barcelone');
  });

  it('excludes settlements I sent (only received ones notify)', () => {
    const sent = settlement({ fromId: ME, toId: MARIE });
    const items = buildNotifications([group()], [], [sent], ME, neverSettled);
    expect(items.some((item) => item.kind === 'received')).toBe(false);
  });

  it('flags an expense added by someone else that concerns me', () => {
    const items = buildNotifications([group()], [expense()], [], ME, neverSettled);
    const share = items.find((item) => item.kind === 'expenseShare')!;
    expect(share.counterpartyName).toBe('Marie');
    expect(share.amount).toBe(84);
    expect(share.groupName).toBe('Vacances Barcelone');
  });

  it('excludes an expense I paid myself', () => {
    const mine = expense({ paidBy: 'm-me' });
    const items = buildNotifications([group()], [mine], [], ME, neverSettled);
    expect(items.some((item) => item.kind === 'expenseShare')).toBe(false);
  });

  it('excludes an expense where my share is zero', () => {
    const other = expense({
      paidBy: 'm-marie',
      shares: [{ memberId: 'm-marie', weight: 0, amount: 84 }],
    });
    const items = buildNotifications([group()], [other], [], ME, neverSettled);
    expect(items.some((item) => item.kind === 'expenseShare')).toBe(false);
  });

  it('flags a new member who joined, excluding myself', () => {
    const items = buildNotifications([group()], [], [], ME, neverSettled);
    const joined = items.filter((item) => item.kind === 'memberJoined');
    expect(joined).toHaveLength(1);
    expect(joined[0].counterpartyName).toBe('Marie');
  });

  it('flags a group as settled when every expense is fully settled, dated at the last settlement', () => {
    const items = buildNotifications([group()], [expense()], [settlement()], ME, alwaysSettled);
    const settled = items.find((item) => item.kind === 'groupSettled')!;
    expect(settled).toBeDefined();
    expect(settled.date).toEqual(settlement().settledAt);
  });

  it('does not flag a group as settled when at least one expense remains open', () => {
    const items = buildNotifications([group()], [expense()], [settlement()], ME, neverSettled);
    expect(items.some((item) => item.kind === 'groupSettled')).toBe(false);
  });

  it('does not flag a group with no settlements as settled, even with no expenses', () => {
    const items = buildNotifications([group()], [], [], ME, alwaysSettled);
    expect(items.some((item) => item.kind === 'groupSettled')).toBe(false);
  });

  it('sorts events most-recent first', () => {
    const older = expense({ id: 'old', createdAt: new Date('2026-07-10T09:00:00Z') });
    const items = buildNotifications([group()], [older, expense()], [settlement()], ME, neverSettled);
    const times = items.map((item) => item.date.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});
