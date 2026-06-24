import { reactive, computed } from 'vue';
import { getCurrentUser, formatAddressShort } from '../utils/nimiq';

// ─────────────────────────────────────────────────────────────────────────
// Store session — identité de l'utilisateur courant (Phase 1).
//
// L'utilisateur connecté (adresse Nimiq + nom) est exposé à toute l'app.
// L'adresse est mise en cache localStorage pour ne pas redéclencher le
// dialogue natif d'accès aux comptes à chaque lancement. La langue est lue
// depuis Nimiq Pay (préparation i18n — Phase 6).
// ─────────────────────────────────────────────────────────────────────────

interface User {
  id: string; // adresse Nimiq
  name: string;
}

interface SessionState {
  user: User | null;
  language: string;
  connecting: boolean;
  error: string;
}

const SESSION_KEY = 'payshare_session';

function detectLanguage(): string {
  const fromPay = window.nimiqPay?.language;
  if (typeof fromPay === 'string' && fromPay.length === 2) return fromPay;
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
});

export function useSession() {
  return {
    user: computed(() => state.user),
    language: computed(() => state.language),
    connecting: computed(() => state.connecting),
    error: computed(() => state.error),
    isLoggedIn: computed(() => state.user !== null),
    // Adresse tronquée prête pour l'affichage du wallet-badge.
    walletShort: computed(() => (state.user ? formatAddressShort(state.user.id) : '')),

    /** Déclenche la connexion wallet (dialogue natif d'accès aux comptes). */
    async connect(): Promise<boolean> {
      state.connecting = true;
      state.error = '';
      try {
        const user = await getCurrentUser();
        state.user = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return true;
      } catch {
        state.error = 'Connexion impossible ou refusée';
        return false;
      } finally {
        state.connecting = false;
      }
    },

    /** Efface la session locale (ne touche jamais aux clés du wallet). */
    disconnect(): void {
      state.user = null;
      localStorage.removeItem(SESSION_KEY);
    },
  };
}
