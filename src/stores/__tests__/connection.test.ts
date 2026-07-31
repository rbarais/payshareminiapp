import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ isJwtExpired: vi.fn() }));

vi.mock('../../utils/auth', () => ({ isJwtExpired: mocks.isJwtExpired }));

function setOnLine(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

describe('connection store', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.isJwtExpired.mockReturnValue(false);
    setOnLine(true);
  });

  it('is connected when the token is valid, the network is up and the API answers', async () => {
    const { useConnection } = await import('../connection');
    expect(useConnection().isConnected.value).toBe(true);
  });

  it('is disconnected when the JWT is expired', async () => {
    mocks.isJwtExpired.mockReturnValue(true);
    const { useConnection } = await import('../connection');
    expect(useConnection().isConnected.value).toBe(false);
  });

  it('is disconnected when the browser reports being offline', async () => {
    setOnLine(false);
    const { useConnection } = await import('../connection');
    expect(useConnection().isConnected.value).toBe(false);
  });

  it('turns disconnected when the API is reported unreachable', async () => {
    const { useConnection, reportApiOutcome } = await import('../connection');
    reportApiOutcome(false);
    expect(useConnection().isConnected.value).toBe(false);
  });

  it('turns connected again once the API answers', async () => {
    const { useConnection, reportApiOutcome } = await import('../connection');
    reportApiOutcome(false);
    reportApiOutcome(true);
    expect(useConnection().isConnected.value).toBe(true);
  });

  it('stays disconnected after a 401 cleared the JWT, even though the server answered', async () => {
    const { useConnection, reportApiOutcome } = await import('../connection');
    mocks.isJwtExpired.mockReturnValue(true);
    reportApiOutcome(true);
    expect(useConnection().isConnected.value).toBe(false);
  });

  it('picks the network back up on the online event', async () => {
    setOnLine(false);
    const { useConnection } = await import('../connection');
    expect(useConnection().isConnected.value).toBe(false);
    setOnLine(true);
    window.dispatchEvent(new Event('online'));
    expect(useConnection().isConnected.value).toBe(true);
  });
});
