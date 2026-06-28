// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as Nimiq from '@nimiq/core';
import { verifyNimiqSignature, messagePreImage } from './nimiq.js';

async function makeVector(message: string) {
  const priv = Nimiq.PrivateKey.generate();
  const pub = Nimiq.PublicKey.derive(priv);
  const preimage = await messagePreImage(message);
  const sig = Nimiq.Signature.create(priv, pub, preimage);
  return {
    publicKey: pub.toHex(),
    signature: sig.toHex(),
    address: pub.toAddress().toUserFriendlyAddress(),
  };
}

describe('verifyNimiqSignature', () => {
  it('returns the correct address for a valid signature', async () => {
    const message = 'PayShare login\naddr: NQ_TEST\nnonce: deadbeef00112233';
    const v = await makeVector(message);
    const addr = await verifyNimiqSignature(message, v.publicKey, v.signature);
    expect(addr.replace(/\s/g, '')).toBe(v.address.replace(/\s/g, ''));
  });

  it('throws when the message is tampered', async () => {
    const message = 'PayShare login\naddr: NQ_TEST\nnonce: deadbeef00112233';
    const v = await makeVector(message);
    await expect(verifyNimiqSignature(message + 'x', v.publicKey, v.signature)).rejects.toThrow();
  });

  it('throws on all-zero inputs', async () => {
    await expect(verifyNimiqSignature('hello', '0'.repeat(64), '0'.repeat(128))).rejects.toThrow();
  });
});
