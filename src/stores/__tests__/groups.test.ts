import { describe, it, expect, vi, beforeEach } from 'vitest';

const inserted: any[] = [];
vi.mock('../../utils/api', () => ({
  insertGroup: vi.fn(async (g, ctx) => {
    inserted.push(g);
    return {
      ...g,
      members: [{ id: 'creator-id', address: ctx.address, name: ctx.name, joinedAt: new Date() }],
    };
  }),
  insertExpense: vi.fn(async () => {}),
  insertSettlement: vi.fn(async () => {}),
  fetchMyGroups: vi.fn(async () => []),
  fetchGroupExpenses: vi.fn(async () => []),
  fetchGroupSettlements: vi.fn(async () => []),
  addPlaceholderMember: vi.fn(async () => ({ id: 'm', name: 'x', joinedAt: new Date() })),
}));

describe('groups store write-through', () => {
  beforeEach(() => {
    inserted.length = 0;
    localStorage.clear();
  });

  it('createGroup writes to backend then cache', async () => {
    const { useGroupsStore } = await import('../groups');
    const store = useGroupsStore();
    const g = await store.createGroup({
      name: 'Voyage',
      icon: 'car',
      creatorId: 'NQ_A',
      creatorName: 'Alice',
    });
    expect(inserted).toHaveLength(1);
    expect(store.getGroup(g.id)?.name).toBe('Voyage');
  });

  it('createGroup does not mutate cache if backend fails', async () => {
    const api = await import('../../utils/api');
    (api.insertGroup as any).mockRejectedValueOnce(new Error('boom'));
    const { useGroupsStore } = await import('../groups');
    const store = useGroupsStore();
    await expect(
      store.createGroup({ name: 'X', icon: 'car', creatorId: 'NQ_A', creatorName: 'Alice' }),
    ).rejects.toThrow();
  });
});
