import type { Room, ShareableRoom } from '../types';

export function encodeRoomToUrl(room: Room): string {
  const shareable: ShareableRoom = {
    id: room.id,
    creatorId: room.creatorId,
    creatorName: room.creatorName,
    amount: room.amount,
    currency: room.currency,
    reason: room.reason,
    maxParticipants: room.maxParticipants,
  };
  const encoded = encodeURIComponent(btoa(JSON.stringify(shareable)));
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?r=${encoded}`;
}

export function decodeRoomFromUrl(): ShareableRoom | null {
  return decodeRoomFromText(window.location.href);
}

// Extrait les données d'une room depuis n'importe quel texte (URL ou deeplink)
export function decodeRoomFromText(text: string): ShareableRoom | null {
  try {
    const r = new URL(text).searchParams.get('r');
    if (!r) return null;
    return JSON.parse(atob(decodeURIComponent(r))) as ShareableRoom;
  } catch {
    return null;
  }
}

export function amountPerPerson(room: ShareableRoom): number {
  return room.amount / room.maxParticipants;
}

// Tag unique embarqué dans le champ `data` du paiement, sert à filtrer
// les transactions de CETTE room lors de la lecture de la blockchain.
export function roomTag(roomId: string): string {
  return `PS:${roomId}`;
}

// Construit le champ `data` du paiement : tag unique + raison lisible,
// tronqué pour tenir dans la limite ~64 octets du champ data Nimiq.
export function paymentData(room: ShareableRoom): string {
  const full = `${roomTag(room.id)} ${room.reason}`;
  return full.length <= 64 ? full : full.slice(0, 64);
}
