import { roomTag } from './room';

// The Nimiq Web Client syncs a light consensus directly in the browser (P2P,
// no central RPC, no rate limit). It is used ONLY to read the blockchain —
// sending payments goes through the mini-app provider.
//
// @nimiq/core is heavy (WASM): it is loaded dynamically on the first read, and
// a single client instance is reused for the session.

let clientPromise: Promise<NimiqClient> | null = null;

// Minimal client type we need (avoids importing the heavy generated types).
interface NimiqClient {
  waitForConsensusEstablished(): Promise<void>;
  getTransactionsByAddress(
    address: string,
    sinceBlockHeight?: number | null,
    knownDetails?: unknown[] | null,
    startAt?: string | null,
    limit?: number | null,
    minPeers?: number | null,
  ): Promise<PlainTx[]>;
}

interface PlainTx {
  transactionHash: string;
  sender: string;
  recipient: string;
  value: number; // in Luna
  timestamp?: number;
  data?: { type: string; raw?: string };
}

async function getClient(): Promise<NimiqClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const Nimiq = await import('@nimiq/core');
      const config = new Nimiq.ClientConfiguration();
      config.network('MainAlbatross');
      const client = (await Nimiq.Client.create(config.build())) as unknown as NimiqClient;
      await client.waitForConsensusEstablished();
      return client;
    })();
  }
  return clientPromise;
}

export interface RoomPayment {
  from: string; // payer address (human-readable format)
  valueNim: number; // amount in NIM
  timestamp: number;
  hash: string;
}

function hexToUtf8(hex: string): string {
  if (!hex) return '';
  try {
    const bytes = hex.match(/.{1,2}/g)?.map((pair) => parseInt(pair, 16)) ?? [];
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return '';
  }
}

function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

/**
 * Read the payments received by the creator for a given room.
 * Filters incoming transactions whose `data` field starts with the room's
 * unique tag. Deduplicates by payer (one share per person).
 */
export async function fetchRoomPayments(
  creatorAddress: string,
  roomId: string,
): Promise<RoomPayment[]> {
  // Real Nimiq addresses only — in dev mode the address is a fake one.
  if (!creatorAddress.startsWith('NQ')) return [];

  const client = await getClient();
  const tag = roomTag(roomId);
  const transactions = await client.getTransactionsByAddress(creatorAddress, 0, null, null, 100);

  const recipient = normalizeAddress(creatorAddress);
  const seenSenders = new Set<string>();
  const payments: RoomPayment[] = [];

  for (const transaction of transactions) {
    if (normalizeAddress(transaction.recipient) !== recipient) continue;
    const raw = transaction.data?.type === 'raw' ? (transaction.data.raw ?? '') : '';
    if (!hexToUtf8(raw).startsWith(tag)) continue;

    const sender = normalizeAddress(transaction.sender);
    if (seenSenders.has(sender)) continue; // keep the most recent (txs sorted descending)
    seenSenders.add(sender);

    payments.push({
      from: transaction.sender,
      valueNim: transaction.value / 1e5,
      timestamp: transaction.timestamp ?? 0,
      hash: transaction.transactionHash,
    });
  }

  return payments;
}
