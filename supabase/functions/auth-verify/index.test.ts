import { assertEquals } from 'https://deno.land/std/assert/mod.ts';
import { decode } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { mintJwt } from './index.ts';

Deno.test('mintJwt sets sub, role and exp', async () => {
  const token = await mintJwt('NQ_ALICE', 'test-secret');
  const [, payload] = decode(token);
  const p = payload as Record<string, unknown>;
  assertEquals(p.sub, 'NQ_ALICE');
  assertEquals(p.role, 'authenticated');
  // exp ~ +7 jours
  const days = ((p.exp as number) - Math.floor(Date.now() / 1000)) / 86400;
  assertEquals(Math.round(days), 7);
});
