import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredJwt, setStoredJwt } from '../auth';

describe('jwt store', () => {
  beforeEach(() => localStorage.clear());
  it('round-trips the token', () => {
    expect(getStoredJwt()).toBeNull();
    setStoredJwt('ey.abc');
    expect(getStoredJwt()).toBe('ey.abc');
    setStoredJwt(null);
    expect(getStoredJwt()).toBeNull();
  });
});
