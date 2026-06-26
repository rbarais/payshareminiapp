import { assertEquals, assertRejects } from 'https://deno.land/std/assert/mod.ts';
import * as Nimiq from 'npm:@nimiq/core@2.7.0';
import { nimiqMessagePreImage, verifyNimiqSignature } from './nimiq-verify.ts';

async function syntheticVector(message: string) {
  const priv = Nimiq.PrivateKey.generate();
  const pub = Nimiq.PublicKey.derive(priv);
  const preimage = await nimiqMessagePreImage(message);
  const sig = Nimiq.Signature.create(priv, pub, preimage);
  return { publicKey: pub.toHex(), signature: sig.toHex(), address: pub.toAddress().toUserFriendlyAddress() };
}

Deno.test('valid signature over the pre-image returns the address (plumbing)', async () => {
  const msg = 'PayShare login\naddr: NQ_TEST\nnonce: deadbeef';
  const v = await syntheticVector(msg);
  const addr = await verifyNimiqSignature(msg, v.publicKey, v.signature);
  assertEquals(addr, v.address);
});

Deno.test('tampered message rejects', async () => {
  const msg = 'PayShare login\naddr: NQ_TEST\nnonce: deadbeef';
  const v = await syntheticVector(msg);
  await assertRejects(() => verifyNimiqSignature(msg + 'x', v.publicKey, v.signature));
});
