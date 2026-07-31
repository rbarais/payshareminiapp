import { reactive, computed } from 'vue';
import { getHostLanguage } from '@nimiq/mini-app-sdk';
import { getCurrentUser, formatAddressShort, detectNimiqApp, isNimiqHost } from '../utils/nimiq';
import { authenticate, refreshToken } from '../utils/auth';
import { setStoredJwt, isJwtExpired } from '../utils/auth';
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
  addresses: string[];
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
  // The host marker is readable synchronously, so inside Nimiq Pay the first
  // paint is already correct. Outside, stay undetermined until the probe ends.
  isNimiqApp: isNimiqHost() ? true : null,
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
      if (state.user) {
        if (isJwtExpired()) {
          // Fully expired (or missing): a fresh signature is required. If it
          // fails (outside Nimiq Pay or signature refused), disconnect.
          try {
            await authenticate(state.user.id);
          } catch {
            state.user = null;
            localStorage.removeItem(SESSION_KEY);
            setStoredJwt(null);
          }
        } else {
          // Still valid: roll the session forward silently, no signature. A
          // failure here is non-fatal — the current token stays usable.
          try {
            await refreshToken();
          } catch {
            // keep the existing valid token
          }
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

    /** Update the current user's display name (session + localStorage). */
    setName(name: string): void {
      if (!state.user) return;
      state.user = { ...state.user, name };
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.user));
    },

    /** Clear the local session (never touches the wallet keys). */
    disconnect(): void {
      state.user = null;
      localStorage.removeItem(SESSION_KEY);
      setStoredJwt(null);
    },
  };
}
