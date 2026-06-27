import { reactive, computed } from 'vue';
import { getHostLanguage } from '@nimiq/mini-app-sdk';
import { getCurrentUser, formatAddressShort, detectNimiqApp } from '../utils/nimiq';
import { authenticate } from '../utils/auth';
import { getStoredJwt, setStoredJwt } from '../utils/auth';

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
  // null = pas encore vérifié · true/false = résultat de la détection provider
  isNimiqApp: boolean | null;
}

const SESSION_KEY = 'payshare_session';

function isJwtExpired(): boolean {
  const jwt = getStoredJwt();
  if (!jwt) return true;
  try {
    // JWT utilise base64url (- et _ au lieu de + et /) — convertir avant atob()
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    // 30s buffer pour éviter les races en fin de validité
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    return true;
  }
}

function detectLanguage(): string {
  // Langue exposée par Nimiq Pay (seedée avant l'exécution du script de page).
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
     * Vérifie via le provider Nimiq qu'on tourne bien dans Nimiq Pay.
     * Mémorise le résultat et le renvoie (true = app Nimiq).
     */
    async checkEnvironment(): Promise<boolean> {
      const ok = await detectNimiqApp();
      state.isNimiqApp = ok;
      // JWT expiré ou absent : on tente un refresh silencieux via le provider.
      // Si ça échoue (hors Nimiq Pay ou signature refusée), on déconnecte.
      if (state.user && isJwtExpired()) {
        try {
          await authenticate(state.user.id);
        } catch {
          state.user = null;
          localStorage.removeItem(SESSION_KEY);
          setStoredJwt(null);
        }
      }
      return ok;
    },
    // Adresse tronquée prête pour l'affichage du wallet-badge.
    walletShort: computed(() => (state.user ? formatAddressShort(state.user.id) : '')),

    /**
     * Déclenche la connexion wallet. N'aboutit que si l'init du provider Nimiq
     * réussit : hors Nimiq Pay (init en erreur), on reste sur l'écran de login.
     */
    async connect(): Promise<boolean> {
      state.connecting = true;
      state.error = '';
      try {
        const inNimiq = await detectNimiqApp();
        state.isNimiqApp = inNimiq;
        if (!inNimiq) {
          state.error = 'Ouvre PayShare dans Nimiq Pay pour te connecter';
          return false;
        }
        const user = await getCurrentUser();
        state.user = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        await authenticate(user.id);
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
      setStoredJwt(null);
    },
  };
}
