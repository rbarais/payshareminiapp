import { reactive, computed } from 'vue';
import { getHostLanguage } from '@nimiq/mini-app-sdk';
import { getCurrentUser, formatAddressShort, detectNimiqApp } from '../utils/nimiq';
import { authenticate } from '../utils/auth';
import { getStoredJwt, setStoredJwt } from '../utils/auth';
import { t } from './i18n';

// ─────────────────────────────────────────────────────────────────────────
// Session store — identity of the current user (Phase 1).
//
// The connected user (Nimiq address + name) is exposed to the whole app.
// The address is cached in localStorage so the native account-access dialog is
// not re-triggered on every launch. The language is read from Nimiq Pay
// (i18n groundwork — Phase 6).
// ─────────────────────────────────────────────────────────────────────────

interface User {
  id: string; // Nimiq address
  name: string;
}

interface SessionState {
  user: User | null;
  language: string;
  connecting: boolean;
  error: string;
  // null = not checked yet · true/false = result of the provider detection
  isNimiqApp: boolean | null;
}

const SESSION_KEY = 'payshare_session';

function isJwtExpired(): boolean {
  const jwt = getStoredJwt();
  if (!jwt) return true;
  try {
    // JWT uses base64url (- and _ instead of + and /) — convert before atob()
    const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    // 30s buffer to avoid races near the end of validity
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    return true;
  }
}

function detectLanguage(): string {
  // Language exposed by Nimiq Pay (seeded before the page script runs).
  const fromHost = getHostLanguage();
  if (typeof fromHost === 'string' && fromHost.length === 2) return fromHost;
  return (navigator.language || 'fr').slice(0, 2);
}

function restoreUser(): User | null {
  try {
    const cached = localStorage.getItem(SESSION_KEY);
    return cached ? (JSON.parse(cached) as User) : null;
  } catch {
    return null;
  }
}

const state = reactive<SessionState>({
  user: restoreUser(),
  language: detectLanguage(),
  connecting: false,
  error: '',
  isNimiqApp: null,
});

export function useSession() {
  return {
    user: computed(() => state.user),
    language: computed(() => state.language),
    connecting: computed(() => state.connecting),
    error: computed(() => state.error),
    isLoggedIn: computed(() => state.user !== null),
    isNimiqApp: computed(() => state.isNimiqApp),

    /**
     * Check via the Nimiq provider that we are running inside Nimiq Pay.
     * Caches the result and returns it (true = Nimiq app).
     */
    async checkEnvironment(): Promise<boolean> {
      const isNimiqApp = await detectNimiqApp();
      state.isNimiqApp = isNimiqApp;
      // JWT expired or missing: attempt a silent refresh through the provider.
      // If it fails (outside Nimiq Pay or signature refused), disconnect.
      if (state.user && isJwtExpired()) {
        try {
          await authenticate(state.user.id);
        } catch {
          state.user = null;
          localStorage.removeItem(SESSION_KEY);
          setStoredJwt(null);
        }
      }
      return isNimiqApp;
    },
    // Truncated address ready for the wallet-badge display.
    walletShort: computed(() => (state.user ? formatAddressShort(state.user.id) : '')),

    /**
     * Trigger the wallet connection. Only succeeds if the Nimiq provider init
     * succeeds: outside Nimiq Pay (init error), we stay on the login screen.
     *
     * authenticate() is called before updating state.user so showApp does not
     * flip to true (HomeView mounts) before the JWT is stored. Otherwise
     * HomeView fires GET /api/groups without a token → 401.
     */
    async connect(): Promise<boolean> {
      state.connecting = true;
      state.error = '';
      try {
        const inNimiq = await detectNimiqApp();
        state.isNimiqApp = inNimiq;
        if (!inNimiq) {
          state.error = t('error.openInNimiq');
          return false;
        }
        const user = await getCurrentUser();
        await authenticate(user.id);
        state.user = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return true;
      } catch (error) {
        state.error = error instanceof Error ? error.message : t('error.connectFailed');
        return false;
      } finally {
        state.connecting = false;
      }
    },

    /** Clear the local session (never touches the wallet keys). */
    disconnect(): void {
      state.user = null;
      localStorage.removeItem(SESSION_KEY);
      setStoredJwt(null);
    },
  };
}
