// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getPublicKeyAsync, signAsync } from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha2.js';
import { verifyNimiqSignature, pubKeyToAddress, messageHash } from './nimiq.js';

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

// Independent oracle: this publicKey → address mapping was produced by canonical
// @nimiq/core and is independent of the message-signing scheme.
const ADDR_VECTOR = {
  publicKey: 'c56639fc0d99ef981e90a1594f40a8515ce59fde2f7658dfe3a5be330cc11003',
  address: 'NQ62 Q7S4 Y8QN 85HQ XJPG R48B JBQ8 SH0A J2VD',
};

describe('pubKeyToAddress', () => {
  it('derives the canonical Nimiq address from a public key', () => {
    const bytes = Uint8Array.from(
      (ADDR_VECTOR.publicKey.match(/../g) ?? []).map((byte) => parseInt(byte, 16)),
    );
    expect(pubKeyToAddress(bytes).replace(/\s/g, '')).toBe(ADDR_VECTOR.address.replace(/\s/g, ''));
  });
});

describe('verifyNimiqSignature', () => {
  it('accepts a signature over the Nimiq signed-message hash and returns the signer', async () => {
    const priv = new Uint8Array(32).fill(9);
    const pub = await getPublicKeyAsync(priv);
    const message = 'PayShare login\nnonce: deadbeef00112233';
    const signature = await signAsync(messageHash(message), priv);

    const addr = await verifyNimiqSignature(message, toHex(pub), toHex(signature));
    expect(addr).toBe(pubKeyToAddress(pub));
    expect(addr).toMatch(/^NQ/);
  });

  it('throws when the message is tampered', async () => {
    const priv = new Uint8Array(32).fill(9);
    const pub = await getPublicKeyAsync(priv);
    const signature = await signAsync(messageHash('original'), priv);
    await expect(verifyNimiqSignature('originalx', toHex(pub), toHex(signature))).rejects.toThrow();
  });

  it('throws on all-zero inputs', async () => {
    await expect(verifyNimiqSignature('hello', '0'.repeat(64), '0'.repeat(128))).rejects.toThrow();
  });

  it('verifies a multi-byte UTF-8 message using the byte length, not the JS string length', async () => {
    const priv = new Uint8Array(32).fill(11);
    const pub = await getPublicKeyAsync(priv);
    const message = 'Connexion à Payshare — café';

    // Sanity check: this message must actually exercise the bug (UTF-8 byte
    // length differs from the JS string length for accented/multi-byte chars).
    const messageBytes = new TextEncoder().encode(message);
    expect(messageBytes.byteLength).not.toBe(message.length);

    // Independently reproduce the canonical Keyguard scheme by hand (byte
    // length, not string length) so this test can't pass by merely being
    // self-consistent with a buggy messageHash().
    const prefixBytes = new TextEncoder().encode(
      '\x16Nimiq Signed Message:\n' + messageBytes.byteLength,
    );
    const data = new Uint8Array(prefixBytes.length + messageBytes.length);
    data.set(prefixBytes, 0);
    data.set(messageBytes, prefixBytes.length);
    const signature = await signAsync(sha256(data), priv);

    const addr = await verifyNimiqSignature(message, toHex(pub), toHex(signature));
    expect(addr).toBe(pubKeyToAddress(pub));
  });
});
