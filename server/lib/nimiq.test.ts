// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { verifyNimiqSignature } from './nimiq.js';

// Canonical Nimiq signing vector, generated once with @nimiq/core
// (PrivateKey.generate / PublicKey.derive / Signature.create over
// messagePreImage(message)) then frozen here so the test carries no runtime
// crypto dependency. Ed25519 is deterministic, so the vector is stable, and the
// address was derived by canonical Nimiq code — giving us an independent oracle
// to check verifyNimiqSignature against.
const VECTOR = {
  message: 'PayShare login\naddr: NQ_TEST\nnonce: deadbeef00112233',
  publicKey: 'c56639fc0d99ef981e90a1594f40a8515ce59fde2f7658dfe3a5be330cc11003',
  signature:
    '8416f662b95f2c3b9adc435e2e365e11ee2517403f70467c96526db53625770389ce6750d102a727c5d586f60f0a850310cddc9c64a6cd526eefb29650752c0b',
  address: 'NQ62 Q7S4 Y8QN 85HQ XJPG R48B JBQ8 SH0A J2VD',
};

describe('verifyNimiqSignature', () => {
  it('returns the correct address for a valid signature', async () => {
    const addr = await verifyNimiqSignature(VECTOR.message, VECTOR.publicKey, VECTOR.signature);
    expect(addr.replace(/\s/g, '')).toBe(VECTOR.address.replace(/\s/g, ''));
  });

  it('throws when the message is tampered', async () => {
    await expect(
      verifyNimiqSignature(VECTOR.message + 'x', VECTOR.publicKey, VECTOR.signature),
    ).rejects.toThrow();
  });

  it('throws on all-zero inputs', async () => {
    await expect(verifyNimiqSignature('hello', '0'.repeat(64), '0'.repeat(128))).rejects.toThrow();
  });
});
