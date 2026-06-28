import type { ShareableRoom } from '../types';

export function decodeRoomFromUrl(): ShareableRoom | null {
  return decodeRoomFromText(window.location.href);
}

// Encode a shareable payment payload into a URL (?r=base64).
// Decoded at startup by App.vue → routes to the payment screen.
export function encodeShareUrl(shareable: ShareableRoom): string {
  const encoded = encodeURIComponent(btoa(JSON.stringify(shareable)));
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?r=${encoded}`;
}

// Build an invite link that OPENS the mini-app inside Nimiq Pay (deeplink),
// embedding the share URL (?r=…). Sent to a guest via message:
// tap → Nimiq Pay opens → the expense loads → they connect their wallet and pay
// (on-chain detection, no backend). NB: the first open of a non-whitelisted URL
// triggers a Nimiq Pay security warning; the recipient must have Nimiq Pay.
export function buildInviteDeeplink(shareUrl: string): string {
  return `nimiqpay://miniapp?url=${encodeURIComponent(shareUrl)}`;
}

// Extract room data from any text (URL or deeplink).
export function decodeRoomFromText(text: string): ShareableRoom | null {
  try {
    const encoded = new URL(text).searchParams.get('r');
    if (!encoded) return null;
    return JSON.parse(atob(decodeURIComponent(encoded))) as ShareableRoom;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Invitation to join a synchronized group (Supabase). Different from ?r=
// (payment): ?g=<groupId>&t=<inviteToken> → opens the "Join" screen.
// ─────────────────────────────────────────────────────────────────────────

// Invite params live in the hash (#/join?g=&t=) rather than the query string
// so Nimiq Pay always identifies the app by origin alone → a single "PayShare"
// entry in the mini-app list, whatever the group.
export function buildInviteUrl(groupId: string, token: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/join?g=${encodeURIComponent(groupId)}&t=${encodeURIComponent(token)}`;
}

export function decodeInviteFromText(text: string): { groupId: string; token: string } | null {
  try {
    const url = new URL(text);
    // Hash format: https://payshare.app/#/join?g=...&t=...
    const hashSearch = url.hash.includes('?') ? new URLSearchParams(url.hash.split('?')[1]) : null;
    const groupId = hashSearch?.get('g') ?? url.searchParams.get('g');
    const token = hashSearch?.get('t') ?? url.searchParams.get('t');
    if (!groupId || !token) return null;
    return { groupId, token };
  } catch {
    return null;
  }
}

export function amountPerPerson(room: ShareableRoom): number {
  return room.amount / room.maxParticipants;
}

// Unique tag embedded in the payment `data` field, used to filter the
// transactions of THIS room when reading the blockchain.
export function roomTag(roomId: string): string {
  return `PS:${roomId}`;
}

// Build the payment `data` field: unique tag + readable reason, truncated to
// fit within the ~64-byte limit of the Nimiq data field.
export function paymentData(room: ShareableRoom): string {
  const full = `${roomTag(room.id)} ${room.reason}`;
  return full.length <= 64 ? full : full.slice(0, 64);
}
