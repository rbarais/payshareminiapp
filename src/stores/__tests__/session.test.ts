import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('session.setName', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('met à jour le nom de l\'utilisateur et le localStorage', async () => {
    localStorage.setItem(
      'payshare_session',
      JSON.stringify({ id: 'NQ_ALICE', name: 'Nimiq User' }),
    );
    const { useSession } = await import('../session');
    const session = useSession();
    session.setName('Alice');
    expect(session.user.value?.name).toBe('Alice');
    expect(JSON.parse(localStorage.getItem('payshare_session')!).name).toBe('Alice');
  });

  it('ne plante pas si aucun utilisateur connecté', async () => {
    const { useSession } = await import('../session');
    const session = useSession();
    expect(() => session.setName('Alice')).not.toThrow();
    expect(session.user.value).toBeNull();
  });
});
