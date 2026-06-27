import { describe, it, expect } from 'vitest';
import { buildInviteUrl, decodeInviteFromText } from '../room';

describe('invite link', () => {
  it('round-trips groupId + token', () => {
    const url = buildInviteUrl('g1', 'tok123');
    const decoded = decodeInviteFromText(url);
    expect(decoded).toEqual({ groupId: 'g1', token: 'tok123' });
  });
  it('returns null when no invite params', () => {
    expect(decodeInviteFromText('https://app/')).toBeNull();
  });
});
