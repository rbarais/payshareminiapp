import { initNimiq } from './nimiq';
import { roomTag } from './room';
import { captureError } from './errors.ts';
// Chain data (room payments + NIM balance) is read via public Nimiq JSON-RPC —
// no WASM, no P2P setup. We tried the @nimiq/core web client (light node) for
// the balance, but its P2P consensus never establishes inside the Nimiq Pay
// WebView (always timed out), so we read the balance over JSON-RPC instead.
// isConsensusEstablished() (provider) is used as a lightweight network-ready check.

const NIMIQ_RPC_URL = 'https://rpc.nimiqwatch.com';

interface RpcTx {
  hash: string;
  from: string;
  to: string;
  value: number; // Luna
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
    const bytes = (hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16));
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return '';
  }
}

function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

/**
 * Read an account's NIM balance via public JSON-RPC (`getAccountByAddress`),
 * the same lightweight path as fetchRoomPayments. Returns the balance in NIM,
 * or null on failure / non-Nimiq address.
 */
export async function fetchNimBalance(address: string): Promise<number | null> {
  if (!address || !normalizeAddress(address).startsWith('NQ')) return null;
  try {
    const res = await fetch(NIMIQ_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountByAddress',
        params: { address },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { data?: { balance?: number } } };
    const luna = json.result?.data?.balance;
    return typeof luna === 'number' ? luna / 1e5 : null;
  } catch (error) {
    captureError(error, 'fetchNimBalance');
    return null;
  }
}

/**
 * Total NIM balance across all of the user's addresses.
 *
 * Nimiq Pay exposes several addresses per user (`listAccounts()`): a "local"
 * balance (the regular wallet, directly spendable) and a "remote" balance held
 * in a cashlink/HTLC used to pay where BTC Lightning is accepted. Reading only
 * the first address under-reports the real holdings, so we sum every address.
 *
 * Returns the summed balance in NIM, or null only if none could be read
 * (empty list or every lookup failed). Addresses that fail individually are
 * skipped so a single transient error does not hide the whole balance.
 */
export async function fetchNimBalanceTotal(addresses: string[]): Promise<number | null> {
  if (!addresses.length) return null;
  const results = await Promise.all(addresses.map((address) => fetchNimBalance(address)));
  const readable = results.filter((balance): balance is number => balance !== null);
  if (!readable.length) return null;
  return readable.reduce((sum, balance) => sum + balance, 0);
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

  let transactions: RpcTx[];
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
