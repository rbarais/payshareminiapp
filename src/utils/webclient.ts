import { initNimiq } from './nimiq';
import { roomTag } from './room';

// Transaction data read via public Nimiq JSON-RPC — no WASM, no P2P setup.
// isConsensusEstablished() (provider) is used as a lightweight network-ready check
// instead of spinning up a local @nimiq/core light node.

const NIMIQ_RPC_URL = 'https://rpc.nimiqwatch.com';

interface RpcTx {
  hash: string;
  from: string;
  to: string;
  value: number;     // Luna
  timestamp: number; // milliseconds
  recipientData: string; // hex-encoded
}

export interface RoomPayment {
  from: string;
  valueNim: number;
  timestamp: number; // milliseconds
  hash: string;
}

function hexToUtf8(hex: string): string {
  if (!hex) return '';
  try {
    const bytes = (hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16));
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return '';
  }
}

function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

/**
 * Read payments received by the creator for a given room via public JSON-RPC.
 * Filters by room tag in recipientData. Deduplicates by payer (one share per person).
 */
export async function fetchRoomPayments(
  creatorAddress: string,
  roomId: string,
): Promise<RoomPayment[]> {
  if (!creatorAddress.startsWith('NQ')) return [];

  // Use the wallet's consensus status as a network-ready signal (instant, no P2P setup).
  // Outside Nimiq Pay the provider is unavailable — skip the check and query anyway.
  try {
    const provider = await initNimiq();
    const ready = await provider.isConsensusEstablished();
    if (!ready) return [];
  } catch {
    // dev browser or provider timeout — proceed without the guard
  }

  let transactions: RpcTx[] = [];
  try {
    const res = await fetch(NIMIQ_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransactionsByAddress',
        params: { address: creatorAddress, max: 100 },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { result?: { data?: RpcTx[] } };
    transactions = json.result?.data ?? [];
  } catch {
    return [];
  }

  const tag = roomTag(roomId);
  const recipient = normalizeAddress(creatorAddress);
  const seenSenders = new Set<string>();
  const payments: RoomPayment[] = [];

  for (const tx of transactions) {
    if (normalizeAddress(tx.to) !== recipient) continue;
    if (!hexToUtf8(tx.recipientData).startsWith(tag)) continue;

    const sender = normalizeAddress(tx.from);
    if (seenSenders.has(sender)) continue; // keep first (RPC returns newest-first)
    seenSenders.add(sender);

    payments.push({
      from: tx.from,
      valueNim: tx.value / 1e5,
      timestamp: tx.timestamp,
      hash: tx.hash,
    });
  }

  return payments;
}
