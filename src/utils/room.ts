import type { ShareableRoom } from '../types';

export function decodeRoomFromUrl(): ShareableRoom | null {
  return decodeRoomFromText(window.location.href);
}

// Encode un payload de paiement partageable dans une URL (?r=base64).
// Décodé au démarrage par App.vue → route vers l'écran de paiement.
export function encodeShareUrl(shareable: ShareableRoom): string {
  const encoded = encodeURIComponent(btoa(JSON.stringify(shareable)));
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?r=${encoded}`;
}

// Construit un lien d'invitation qui OUVRE la mini-app dans Nimiq Pay (deeplink),
// en y embarquant l'URL de partage (?r=…). À envoyer à un invité par message :
// tap → Nimiq Pay s'ouvre → la dépense se charge → il connecte son wallet et paie
// (détection on-chain, sans backend). NB : 1re ouverture d'une URL non whitelistée
// = avertissement de sécurité Nimiq Pay ; le destinataire doit avoir Nimiq Pay.
export function buildInviteDeeplink(shareUrl: string): string {
  return `nimiqpay://miniapp?url=${encodeURIComponent(shareUrl)}`;
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

// ─────────────────────────────────────────────────────────────────────────
// Invitation à rejoindre un groupe synchronisé (Supabase). Différent du ?r=
// (paiement) : ?g=<groupId>&t=<inviteToken> → ouvre l'écran « Rejoindre ».
// ─────────────────────────────────────────────────────────────────────────

// Les params d'invitation sont dans le hash (#/join?g=&t=) et non en query string
// pour que Nimiq Pay identifie toujours l'app via l'origine seule → une seule
// entrée "PayShare" dans la liste des mini-apps, quel que soit le groupe.
export function buildInviteUrl(groupId: string, token: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/join?g=${encodeURIComponent(groupId)}&t=${encodeURIComponent(token)}`;
}

export function decodeInviteFromText(text: string): { groupId: string; token: string } | null {
  try {
    const u = new URL(text);
    // Format hash : https://payshare.app/#/join?g=...&t=...
    const hashSearch = u.hash.includes('?') ? new URLSearchParams(u.hash.split('?')[1]) : null;
    const groupId = hashSearch?.get('g') ?? u.searchParams.get('g');
    const token   = hashSearch?.get('t') ?? u.searchParams.get('t');
    if (!groupId || !token) return null;
    return { groupId, token };
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
