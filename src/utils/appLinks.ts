import { buildInviteDeeplink } from './room';

// ─────────────────────────────────────────────────────────────────────────
// Getting a visitor from a plain browser into Nimiq Pay.
//
// The `nimiqpay://` scheme is the only way in, and it fails SILENTLY when the
// app is not installed: the browser stays on the page (iOS may show an "address
// invalid" alert). There is no API to ask whether a scheme is handled, so we
// race the navigation against a timer — if the page is still in the foreground
// after the delay, the app never took over and we send the user to the store.
// ─────────────────────────────────────────────────────────────────────────

const APP_STORE_URL = 'https://apps.apple.com/app/nimiq-pay/id6471844738';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.nimiq.pay';

// Long enough for the OS to show its "Open in Nimiq Pay?" prompt and for the
// switch to happen, short enough to not feel like a dead tap.
const STORE_FALLBACK_DELAY_MS = 1600;

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(): Platform {
  const agent = navigator.userAgent;
  if (/android/i.test(agent)) return 'android';
  // iPadOS 13+ reports a macOS user agent; only the touch points give it away.
  const iPadOS = /macintosh/i.test(agent) && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(agent) || iPadOS) return 'ios';
  return 'desktop';
}

/** Store page for the current platform, or null on desktop (no app there). */
export function storeUrl(platform: Platform = detectPlatform()): string | null {
  if (platform === 'ios') return APP_STORE_URL;
  if (platform === 'android') return PLAY_STORE_URL;
  return null;
}

/**
 * Open `url` as a mini app inside Nimiq Pay, falling back to the store when the
 * app is not installed. Must be called from a user gesture (iOS requires one
 * for custom schemes).
 */
export function openInNimiqPay(url: string): void {
  const store = storeUrl();
  if (store) armStoreFallback(store);
  window.location.href = buildInviteDeeplink(url);
}

// Redirect to the store unless the page loses the foreground first — leaving for
// Nimiq Pay hides the page, which is our proof the app answered the deeplink.
function armStoreFallback(store: string): void {
  let handedOver = false;

  const onLeave = () => {
    if (document.visibilityState === 'hidden') handedOver = true;
  };
  const onBlur = () => {
    handedOver = true;
  };

  document.addEventListener('visibilitychange', onLeave);
  window.addEventListener('pagehide', onBlur);
  window.addEventListener('blur', onBlur);

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onLeave);
    window.removeEventListener('pagehide', onBlur);
    window.removeEventListener('blur', onBlur);
    if (handedOver || document.visibilityState === 'hidden') return;
    window.location.href = store;
  }, STORE_FALLBACK_DELAY_MS);
}
