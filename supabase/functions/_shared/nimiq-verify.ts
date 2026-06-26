import { verify as ed25519Verify } from 'https://esm.sh/@noble/ed25519@2';
import { blake2b } from 'https://esm.sh/@noble/hashes@1/blake2b';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

// Nimiq base32 alphabet (differs from standard base32)
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

// IBAN-style MOD97-10 checksum
function nimiqChecksum(encoded: string): string {
  let numStr = '';
  for (const c of encoded + 'NQ00') {
    const idx = B32.indexOf(c);
    numStr += idx >= 0 ? idx.toString() : c;
  }
  let rem = 0;
  for (const c of numStr) rem = (rem * 10 + parseInt(c)) % 97;
  return (98 - rem).toString().padStart(2, '0');
}

function pubKeyToUserFriendlyAddress(pubKeyBytes: Uint8Array): string {
  // Blake2b-256 of pubKey → first 20 bytes = account hash
  const hash = blake2b(pubKeyBytes, { dkLen: 32 });
  const account = hash.slice(0, 20);
  const encoded = base32Encode(account);
  const checksum = nimiqChecksum(encoded);
  const groups = encoded.match(/.{1,4}/g)!;
  return `NQ${checksum} ${groups.join(' ')}`;
}

// SHA-256 of the Nimiq signed-message prefix + message (preimage Keyguard signs)
async function messagePreImage(message: string): Promise<Uint8Array> {
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

  const valid = await ed25519Verify(sigBytes, preimage, pubKeyBytes);
  if (!valid) throw new Error('invalid signature');

  return pubKeyToUserFriendlyAddress(pubKeyBytes);
}
