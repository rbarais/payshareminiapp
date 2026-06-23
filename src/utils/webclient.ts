import { roomTag } from './room';

// Le Web Client Nimiq synchronise un consensus léger directement dans le
// navigateur (P2P, pas de RPC central, pas de rate-limit). Il sert UNIQUEMENT
// à lire la blockchain — l'envoi des paiements passe par le provider mini-app.
//
// @nimiq/core est lourd (WASM) : on le charge dynamiquement à la première
// lecture, et on réutilise une seule instance de client pour la session.

let clientPromise: Promise<NimiqClient> | null = null;

// Type minimal du client dont on a besoin (évite d'importer les types lourds).
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
  value: number; // en Luna
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
  from: string;      // adresse du payeur (format lisible)
  valueNim: number;  // montant en NIM
  timestamp: number;
  hash: string;
}

function hexToUtf8(hex: string): string {
  if (!hex) return '';
  try {
    const bytes = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return '';
  }
}

function normalizeAddress(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

/**
 * Lit les paiements reçus par le créateur pour une room donnée.
 * Filtre les transactions entrantes dont le champ `data` commence par le
 * tag unique de la room. Déduplique par payeur (une part par personne).
 */
export async function fetchRoomPayments(
  creatorAddress: string,
  roomId: string,
): Promise<RoomPayment[]> {
  // Adresses Nimiq réelles uniquement — en mode dev l'adresse est factice.
  if (!creatorAddress.startsWith('NQ')) return [];

  const client = await getClient();
  const tag = roomTag(roomId);
  const txs = await client.getTransactionsByAddress(creatorAddress, 0, null, null, 100);

  const recipient = normalizeAddress(creatorAddress);
  const seen = new Set<string>();
  const payments: RoomPayment[] = [];

  for (const tx of txs) {
    if (normalizeAddress(tx.recipient) !== recipient) continue;
    const raw = tx.data?.type === 'raw' ? (tx.data.raw ?? '') : '';
    if (!hexToUtf8(raw).startsWith(tag)) continue;

    const from = normalizeAddress(tx.sender);
    if (seen.has(from)) continue; // garde le plus récent (txs triées descendant)
    seen.add(from);

    payments.push({
      from: tx.sender,
      valueNim: tx.value / 1e5,
      timestamp: tx.timestamp ?? 0,
      hash: tx.transactionHash,
    });
  }

  return payments;
}
