import { verifyAsync as ed25519Verify } from '@noble/ed25519';
import { blake2b } from '@noble/hashes/blake2.js';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

const B32 = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

function base32Encode(bytes: Uint8Array): string {
  let buf = 0, bits = 0, out = '';
  for (const b of bytes) {
    buf = (buf << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32[(buf >> bits) & 0x1f];
    }
  }
  if (bits > 0) out += B32[(buf << (5 - bits)) & 0x1f];
  return out;
}

// IBAN MOD-97-10 checksum: digits stay 0-9, letters use standard A=10..Z=35
function nimiqChecksum(encoded: string): string {
  let numStr = '';
  for (const c of encoded + 'NQ00') {
    const code = c.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      numStr += c; // digit 0-9
    } else {
      numStr += (code - 55).toString(); // A=10, B=11, ..., Z=35
    }
  }
  let rem = 0;
  for (const c of numStr) rem = (rem * 10 + parseInt(c)) % 97;
  return (98 - rem).toString().padStart(2, '0');
}

function pubKeyToAddress(pubKeyBytes: Uint8Array): string {
  const hash = blake2b(pubKeyBytes, { dkLen: 32 });
  const account = hash.slice(0, 20);
  const encoded = base32Encode(account);
  const checksum = nimiqChecksum(encoded);
  const groups = encoded.match(/.{1,4}/g)!;
  return `NQ${checksum} ${groups.join(' ')}`;
}

export async function messagePreImage(message: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode('\x16Nimiq Signed Message:\n' + message);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

export async function verifyNimiqSignature(
  message: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<string> {
  const pubKeyBytes = hexToBytes(publicKeyHex);
  const sigBytes = hexToBytes(signatureHex);
  const preimage = await messagePreImage(message);
  // Use RFC8032 strict mode (zip215: false) to reject small-order / all-zero inputs
  const valid = await ed25519Verify(sigBytes, preimage, pubKeyBytes, { zip215: false });
  if (!valid) throw new Error('invalid signature');
  return pubKeyToAddress(pubKeyBytes);
}
