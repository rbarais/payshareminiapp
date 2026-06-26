import { assertEquals, assertStringIncludes } from 'https://deno.land/std/assert/mod.ts';
import { buildChallenge } from './index.ts';

Deno.test('challenge contains address and nonce', () => {
  const { challenge, nonce } = buildChallenge('NQ_ALICE');
  assertStringIncludes(challenge, 'NQ_ALICE');
  assertStringIncludes(challenge, nonce);
  assertEquals(nonce.length, 32); // 16 bytes hex
});
