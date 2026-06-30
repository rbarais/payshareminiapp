import { describe, it, expect } from 'vitest';
import { paymentData, roomTag } from '../room';
import type { ShareableRoom } from '../../types';

const bytes = (s: string) => new TextEncoder().encode(s).length;

function makeRoom(overrides: Partial<ShareableRoom>): ShareableRoom {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    creatorId: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
    creatorName: 'Alice',
    amount: 10,
    currency: 'NIM',
    reason: 'Test',
    maxParticipants: 1,
    ...overrides,
  };
}

describe('paymentData', () => {
  it('fits within 64 bytes for a short ASCII reason', () => {
    const data = paymentData(makeRoom({ reason: 'Dinner' }));
    expect(bytes(data)).toBeLessThanOrEqual(64);
  });

  it('always starts with the full tag', () => {
    const room = makeRoom({ reason: 'A'.repeat(200) });
    const tag = roomTag(room.id);
    const data = paymentData(room);
    expect(data.startsWith(tag)).toBe(true);
  });

  // The original bug: settle room + French reason exceeded 64 bytes
  it('settle room with French reason (the original bug)', () => {
    const room = makeRoom({
      id: 'settle_550e8400-e29b-41d4-a716-446655440000_a3f9e12b',
      reason: 'Règlement · Mon Groupe',
    });
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    expect(data.startsWith('PS:settle_550e8400-e29b-41d4-a716-446655440000_a3f9e12b')).toBe(true);
  });

  it('French characters (2-byte UTF-8)', () => {
    const room = makeRoom({ reason: 'Réveillon de Noël à l\'église' });
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    expect(data.startsWith(roomTag(room.id))).toBe(true);
  });

  it('Arabic characters (2-byte UTF-8)', () => {
    const room = makeRoom({ reason: 'دفع الفاتورة في المطعم' });
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    expect(data.startsWith(roomTag(room.id))).toBe(true);
  });

  it('CJK characters (3-byte UTF-8)', () => {
    const room = makeRoom({ reason: '餐厅晚餐费用分摊' });
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    expect(data.startsWith(roomTag(room.id))).toBe(true);
  });

  it('emoji (4-byte UTF-8, surrogate pairs in JS)', () => {
    const room = makeRoom({ reason: '🎉🍕🍺 party expenses 🎊🎈' });
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    expect(data.startsWith(roomTag(room.id))).toBe(true);
    // Result must be valid UTF-8 (no split surrogate pair)
    expect(() => new TextEncoder().encode(data)).not.toThrow();
  });

  it('does not split a multi-byte character at the boundary', () => {
    // Fill the reason so that a 2-byte char lands exactly at the byte boundary
    const room = makeRoom({
      id: 'settle_550e8400-e29b-41d4-a716-446655440000_a3f9e12b', // 55-byte tag + space = 56 bytes
      reason: 'Règlement · Extra padding to force truncation here oui', // starts with 2-byte è
    });
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    // Must decode back without errors
    expect(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(data))).toBe(data);
  });

  it('reason longer than 64 bytes alone still produces valid output', () => {
    const room = makeRoom({ reason: '日'.repeat(30) }); // 90 bytes
    const data = paymentData(room);
    expect(bytes(data)).toBeLessThanOrEqual(64);
    expect(data.startsWith(roomTag(room.id))).toBe(true);
  });
});
