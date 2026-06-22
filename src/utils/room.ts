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
