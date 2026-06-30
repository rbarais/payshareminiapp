import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

const NIMIQ_RPC_URL = process.env.NIMIQ_RPC_URL ?? 'https://rpc.nimiqwatch.com';

function hexToUtf8(hex: string): string {
  if (!hex) return '';
  try {
    const bytes = (hex.match(/.{1,2}/g) ?? []).map((pair) => parseInt(pair, 16));
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return '';
  }
}

function normalizeAddr(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

type VerifyResult = 'valid' | 'not_found' | 'invalid';

async function verifyNimiqTx(
  txHash: string,
  fromAddr: string,
  toAddr: string,
  amountNim: number,
  groupId: string,
): Promise<VerifyResult> {
  try {
    const res = await fetch(NIMIQ_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransactionByHash',
        params: { hash: txHash },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return 'not_found';

    const json = (await res.json()) as { result?: { data?: Record<string, unknown> } };
    const tx = json?.result?.data;
    if (!tx) return 'not_found';

    const expectedLunas = Math.round(amountNim * 1e5);
    const dataText = hexToUtf8((tx.recipientData as string) ?? '');

    const recipientOk = normalizeAddr(tx.to as string) === normalizeAddr(toAddr);
    const senderOk = normalizeAddr(tx.from as string) === normalizeAddr(fromAddr);
    const amountOk = Math.abs((tx.value as number) - expectedLunas) <= 10; // ±10 luna
    const tagOk = dataText.startsWith(`PS:settle_${groupId}`);

    const result = recipientOk && senderOk && amountOk && tagOk ? 'valid' : 'invalid';
    if (result === 'invalid') {
      console.error('[verifyNimiqTx] invalid', {
        txHash,
        recipientOk,
        senderOk,
        amountOk,
        tagOk,
        txFrom: tx.from,
        txTo: tx.to,
        txValue: tx.value,
        expectedLunas,
        dataText: dataText.slice(0, 80),
        expectedTag: `PS:settle_${groupId}`,
      });
    }
    return result;
  } catch (err) {
    console.error('[verifyNimiqTx] exception', { txHash, error: String(err) });
    return 'not_found';
  }
}

router.get('/:id/settlements', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const groupId = req.params.id;

  try {
    const member = await sql`
      SELECT 1 FROM members WHERE group_id = ${groupId} AND address = ${address} LIMIT 1
    `;
    if (member.length === 0) {
      res.status(403).json({ error: 'not a member' });
      return;
    }

    const rows = await sql<
      {
        id: string;
        group_id: string;
        from_addr: string;
        to_addr: string;
        amount: string;
        currency: string;
        tx_hash: string | null;
        verified_at: Date | null;
        created_at: Date;
      }[]
    >`
      SELECT id, group_id, from_addr, to_addr, amount, currency, tx_hash, verified_at, created_at
      FROM payments
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;

    res.json(
      rows.map((row) => ({
        id: row.tx_hash ?? row.id,
        groupId: row.group_id,
        fromId: row.from_addr,
        toId: row.to_addr,
        amount: Number(row.amount),
        currency: row.currency,
        settledAt: row.verified_at ?? row.created_at,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/:id/settlements', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const groupId = String(req.params.id);

  try {
    const member = await sql`
      SELECT 1 FROM members WHERE group_id = ${groupId} AND address = ${address} LIMIT 1
    `;
    if (member.length === 0) {
      res.status(403).json({ error: 'not a member' });
      return;
    }

    const body = req.body as {
      fromId: string;
      toId: string;
      amount: number;
      currency: string;
      txHash: string;
      settledAt?: string;
    };

    if (!body.fromId || !body.toId || body.amount == null || !body.currency || !body.txHash) {
      res.status(400).json({ error: 'missing required fields' });
      return;
    }
    if (normalizeAddr(body.fromId) !== normalizeAddr(address)) {
      res.status(403).json({ error: 'fromId must match authenticated user' });
      return;
    }

    // Idempotent by tx_hash
    const existing = await sql`
      SELECT 1 FROM payments WHERE group_id = ${groupId} AND tx_hash = ${body.txHash} LIMIT 1
    `;
    if (existing.length > 0) {
      res.status(200).end();
      return;
    }

    // On-chain verification via Nimiq RPC
    const verified = await verifyNimiqTx(body.txHash, body.fromId, body.toId, body.amount, groupId);
    if (verified === 'invalid') {
      res.status(422).json({ error: 'transaction does not match settlement data' });
      return;
    }

    // 'valid' → verified_at = now ; 'not_found' → verified_at = null (RPC unavailable)
    const verifiedAt = verified === 'valid' ? new Date() : null;

    await sql`
      INSERT INTO payments (group_id, from_addr, to_addr, amount, currency, tx_hash, verified_at)
      VALUES (
        ${groupId}, ${body.fromId}, ${body.toId}, ${body.amount},
        ${body.currency}, ${body.txHash}, ${verifiedAt}
      )
    `;

    res.status(201).json({ verified: verified === 'valid' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
