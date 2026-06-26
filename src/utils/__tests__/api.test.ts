import { describe, it, expect, vi } from 'vitest';

const single = { data: { name: 'Voyage', icon: 'car' }, error: null };
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ error: null })),
    })),
    rpc: vi.fn(async () => single),
  },
}));

describe('api', () => {
  it('joinGroup returns group info', async () => {
    const { joinGroup } = await import('../api');
    const res = await joinGroup('g1', 'tok', 'Bob');
    expect(res.name).toBe('Voyage');
  });
});
