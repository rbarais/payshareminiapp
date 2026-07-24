import { verifyAsync as ed25519Verify } from '@noble/ed25519';
import { blake2b } from '@noble/hashes/blake2.js';
import { sha256 } from '@noble/hashes/sha2.js';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let index = 0; index < clean.length; index += 2) {
    out[index / 2] = parseInt(clean.slice(index, index + 2), 16);
  }
  return out;
}

const B32 = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

function base32Encode(bytes: Uint8Array): string {
  let buf = 0,
    bits = 0,
    out = '';
  for (const byte of bytes) {
    buf = (buf << 8) | byte;
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
  for (const char of encoded + 'NQ00') {
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      numStr += char; // digit 0-9
    } else {
      numStr += (code - 55).toString(); // A=10, B=11, ..., Z=35
    }
  }
  let rem = 0;
  for (const digit of numStr) rem = (rem * 10 + parseInt(digit)) % 97;
  return (98 - rem).toString().padStart(2, '0');
}

export function pubKeyToAddress(pubKeyBytes: Uint8Array): string {
  const hash = blake2b(pubKeyBytes, { dkLen: 32 });
  const account = hash.slice(0, 20);
  const encoded = base32Encode(account);
  const checksum = nimiqChecksum(encoded);
  const groups = encoded.match(/.{1,4}/g)!;
  return `NQ${checksum} ${groups.join(' ')}`;
}

const MSG_PREFIX = '\x16Nimiq Signed Message:\n';

// The value Ed25519 signs for a Nimiq "signed message":
// sha256(prefix + messageByteLength + message). Per the canonical Keyguard
// implementation (Key.js#signMessage), the length is the UTF-8 BYTE length of
// the message, not the JS string length — they diverge for any non-ASCII
// character (accents, umlauts, ...), which silently breaks verification for
// every non-English challenge.
export function messageHash(message: string): Uint8Array {
  const messageBytes = new TextEncoder().encode(message);
  const prefixBytes = new TextEncoder().encode(MSG_PREFIX + messageBytes.byteLength);
  const data = new Uint8Array(prefixBytes.length + messageBytes.length);
  data.set(prefixBytes, 0);
  data.set(messageBytes, prefixBytes.length);
  return sha256(data);
}

export async function verifyNimiqSignature(
  message: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<string> {
  const pubKeyBytes = hexToBytes(publicKeyHex);
  const sigBytes = hexToBytes(signatureHex);
  const hash = messageHash(message);
  const valid = await ed25519Verify(sigBytes, hash, pubKeyBytes, { zip215: false });
  if (!valid) throw new Error('invalid signature');
  return pubKeyToAddress(pubKeyBytes);
}
