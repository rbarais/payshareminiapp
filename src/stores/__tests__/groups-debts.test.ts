import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/api', () => ({
  insertGroup: vi.fn(),
  insertExpense: vi.fn(),
  insertSettlement: vi.fn(async () => {}),
  fetchMyGroups: vi.fn(async () => []),
  fetchGroupExpenses: vi.fn(async () => []),
  fetchGroupSettlements: vi.fn(async () => []),
  fetchGroupMembers: vi.fn(async () => []),
  addPlaceholderMember: vi.fn(),
  fetchAllSettlements: vi.fn(async () => []),
}));

const ME = 'NQ01AAAA';
const MARIE = 'NQ02BBBB';

// Seed the localStorage cache the store hydrates from at import time.
function seed(settlements: unknown[] = []) {
  localStorage.setItem(
    'payshare_groups',
    JSON.stringify([
      {
        id: 'g1',
        name: 'Test',
        icon: 'car',
        creatorId: MARIE,
        currencies: ['NIM'],
        createdAt: '2026-07-01T00:00:00.000Z',
        members: [
          { id: 'me', address: ME, name: 'Moi', joinedAt: '2026-07-01T00:00:00.000Z' },
          { id: 'marie', address: MARIE, name: 'Marie', joinedAt: '2026-07-01T00:00:00.000Z' },
        ],
      },
    ]),
  );
  localStorage.setItem(
    'payshare_expenses',
    JSON.stringify([
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Resto',
        amount: 10,
        currency: 'NIM',
        paidBy: 'marie',
        split: 'equal',
        shares: [
          { memberId: 'me', weight: 0, amount: 5 },
          { memberId: 'marie', weight: 0, amount: 5 },
        ],
        createdAt: '2026-07-01T10:00:00.000Z',
      },
      {
        id: 'e2',
        groupId: 'g1',
        description: 'Essence',
        amount: 8,
        currency: 'NIM',
        paidBy: 'marie',
        split: 'equal',
        shares: [
          { memberId: 'me', weight: 0, amount: 4 },
          { memberId: 'marie', weight: 0, amount: 4 },
        ],
        createdAt: '2026-07-01T11:00:00.000Z',
      },
    ]),
  );
  localStorage.setItem('payshare_settlements', JSON.stringify(settlements));
}

async function freshStore() {
  vi.resetModules();
  const { useGroupsStore } = await import('../groups');
  return useGroupsStore();
}

beforeEach(() => {
  localStorage.clear();
});

describe('grossDebtsForUser with allocations', () => {
  it('reports all shares open without settlements', async () => {
    seed();
    const store = await freshStore();
    const debts = store.grossDebtsForUser('g1', ME);
    expect(debts).toHaveLength(1);
    expect(debts[0].remaining).toBe(9);
    expect(debts[0].expenses.map((i) => i.settled)).toEqual([false, false]);
    expect(debts[0].expenses.map((i) => i.open)).toEqual([5, 4]);
  });

  it('settles one expense from an allocated settlement', async () => {
    seed([
      {
        id: 'tx1',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [{ expenseId: 'e1', amount: 5 }],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    const debts = store.grossDebtsForUser('g1', ME);
    expect(debts).toHaveLength(1);
    expect(debts[0].remaining).toBe(4);
    const resto = debts[0].expenses.find((i) => i.expense.id === 'e1')!;
    expect(resto.settled).toBe(true);
    expect(resto.txHash).toBe('tx1');
    const essence = debts[0].expenses.find((i) => i.expense.id === 'e2')!;
    expect(essence.settled).toBe(false);
  });

  it('drops the creditor when everything is allocated', async () => {
    seed([
      {
        id: 'tx1',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 9,
        currency: 'NIM',
        allocations: [
          { expenseId: 'e1', amount: 5 },
          { expenseId: 'e2', amount: 4 },
        ],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    expect(store.grossDebtsForUser('g1', ME)).toHaveLength(0);
  });

  it('spreads a legacy unallocated settlement across expenses, oldest first', async () => {
    seed([
      {
        id: 'tx-legacy',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    const debts = store.grossDebtsForUser('g1', ME);
    expect(debts[0].remaining).toBe(4);
    // The legacy payment (5) fully covers the oldest expense (e1, share 5);
    // e2 stays open. Each expense now reflects the payment.
    const resto = debts[0].expenses.find((i) => i.expense.id === 'e1')!;
    expect(resto.settled).toBe(true);
    expect(resto.txHash).toBe('tx-legacy');
    const essence = debts[0].expenses.find((i) => i.expense.id === 'e2')!;
    expect(essence.settled).toBe(false);
    expect(essence.open).toBe(4);
  });

  it('drops the creditor when a legacy settlement covers everything', async () => {
    seed([
      {
        id: 'tx-legacy',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 9,
        currency: 'NIM',
        allocations: [],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    expect(store.grossDebtsForUser('g1', ME)).toHaveLength(0);
  });
});

describe('myShareStatus', () => {
  it('returns the open share for a debtor', async () => {
    seed();
    const store = await freshStore();
    expect(store.myShareStatus('g1', 'e1', ME)).toEqual({
      share: 5,
      open: 5,
      settled: false,
      txHash: null,
    });
  });

  it('returns settled with the tx hash once allocated', async () => {
    seed([
      {
        id: 'tx1',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [{ expenseId: 'e1', amount: 5 }],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    expect(store.myShareStatus('g1', 'e1', ME)).toEqual({
      share: 5,
      open: 0,
      settled: true,
      txHash: 'tx1',
    });
  });

  it('returns settled from a legacy unallocated settlement', async () => {
    seed([
      {
        id: 'tx-legacy',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    expect(store.myShareStatus('g1', 'e1', ME)).toEqual({
      share: 5,
      open: 0,
      settled: true,
      txHash: 'tx-legacy',
    });
  });

  it('returns null for the payer of the expense', async () => {
    seed();
    const store = await freshStore();
    expect(store.myShareStatus('g1', 'e1', MARIE)).toBeNull();
  });

  it('returns null when the address is not a member', async () => {
    seed();
    const store = await freshStore();
    expect(store.myShareStatus('g1', 'e1', 'NQ99ZZZZ')).toBeNull();
  });
});

describe('expenseFullySettled', () => {
  it('is false while a debtor still owes their share', async () => {
    seed();
    const store = await freshStore();
    expect(store.expenseFullySettled('g1', 'e1')).toBe(false);
  });

  it('is true once every debtor share is covered (allocated)', async () => {
    seed([
      {
        id: 'tx1',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [{ expenseId: 'e1', amount: 5 }],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    expect(store.expenseFullySettled('g1', 'e1')).toBe(true);
    expect(store.expenseFullySettled('g1', 'e2')).toBe(false);
  });

  it('is true once a legacy payment covers the debtor share', async () => {
    seed([
      {
        id: 'tx-legacy',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    // The legacy payment (5) covers the oldest expense e1 in full.
    expect(store.expenseFullySettled('g1', 'e1')).toBe(true);
    expect(store.expenseFullySettled('g1', 'e2')).toBe(false);
  });
});

describe('expenseSettledRatio', () => {
  it('is 0 when nothing has been reimbursed', async () => {
    seed();
    const store = await freshStore();
    expect(store.expenseSettledRatio('g1', 'e1')).toBe(0);
  });

  it('is 1 once the debtor share is fully allocated', async () => {
    seed([
      {
        id: 'tx1',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 5,
        currency: 'NIM',
        allocations: [{ expenseId: 'e1', amount: 5 }],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    expect(store.expenseSettledRatio('g1', 'e1')).toBe(1);
    expect(store.expenseSettledRatio('g1', 'e2')).toBe(0);
  });

  it('reflects a partial reimbursement', async () => {
    seed([
      {
        id: 'tx-legacy',
        groupId: 'g1',
        fromId: ME,
        toId: MARIE,
        amount: 3,
        currency: 'NIM',
        allocations: [],
        settledAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
    const store = await freshStore();
    // Legacy 3 applied to e1 (share 5) → 3/5 reimbursed; e2 untouched.
    expect(store.expenseSettledRatio('g1', 'e1')).toBeCloseTo(0.6, 5);
    expect(store.expenseSettledRatio('g1', 'e2')).toBe(0);
  });
});
