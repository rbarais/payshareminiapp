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

// Build the payment `data` field: unique tag + readable reason.
//
// The Nimiq protocol enforces a strict 64-BYTE limit on transaction data.
// JavaScript strings are UTF-16; multi-byte UTF-8 characters like French 'è'
// (2 bytes), '·' (2 bytes), CJK (3 bytes), or emoji (4 bytes) make
// byte-count > char-count. Slicing at 64 *characters* can exceed 64 bytes
// and causes "Transaction invalidated during transaction" from Nimiq Pay.
//
// The tag (PS:<id>) is always pure ASCII (UUID-based) so it never needs
// truncation. Only the reason is trimmed to fit the remaining byte budget.
export function paymentData(room: ShareableRoom): string {
  const LIMIT = 64;
  const tag = roomTag(room.id);
  const sep = ' ';

  const full = `${tag}${sep}${room.reason}`;
  const encoded = new TextEncoder().encode(full);
  if (encoded.length <= LIMIT) return full;

  const reasonBudget = LIMIT - new TextEncoder().encode(tag + sep).length;
  const reasonEncoded = new TextEncoder().encode(room.reason);

  // Back up over UTF-8 continuation bytes (0x80–0xBF) to avoid splitting a
  // multi-byte character at the truncation boundary.
  let end = reasonBudget;
  while (end > 0 && (reasonEncoded[end] & 0xc0) === 0x80) end--;
  return `${tag}${sep}${new TextDecoder().decode(reasonEncoded.slice(0, end))}`;
}
