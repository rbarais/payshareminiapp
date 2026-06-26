import { init } from '@nimiq/mini-app-sdk';
import type { NimiqProvider } from '@nimiq/mini-app-sdk';

// ─────────────────────────────────────────────────────────────────────────
// Initialisation du provider Nimiq.
//
// Suivant le tutoriel officiel : on lance `init({ timeout })` UNE seule fois
// au démarrage (App.vue onMounted) et on conserve la promesse. `init()` poll
// l'injection de `window.nimiq` et rejette après le timeout si on n'est pas
// dans Nimiq Pay. Toutes les fonctions ci-dessous awaitent cette même promesse
// — pas de second appel, pas de dépendance à un check synchrone non fiable.
// ─────────────────────────────────────────────────────────────────────────


let nimiqPromise: Promise<NimiqProvider> | null = null;

/** Démarre (ou réutilise) l'initialisation du provider. */
export function initNimiq(): Promise<NimiqProvider> {
  if (!nimiqPromise) {
    nimiqPromise = init();
  }
  return nimiqPromise;
}

/**
 * Détecte si l'app tourne dans Nimiq Pay : true si le provider s'initialise,
 * false si `init()` rejette (provider jamais injecté). Réutilise la promesse
 * d'init partagée — aucun appel `init()` supplémentaire.
 */
export async function detectNimiqApp(): Promise<boolean> {
  try {
    await initNimiq();
    return true;
  } catch {
    return false;
  }
}

/** Provider si disponible, sinon null (hors Nimiq Pay). Ne rejette pas. */
async function getProvider(): Promise<NimiqProvider | null> {
  try {
    return await initNimiq();
  } catch {
    return null;
  }
}

/** Récupère l'adresse Nimiq de l'utilisateur courant (déclenche le dialogue). */
export async function getNimiqAddress(): Promise<string> {
  const provider = await initNimiq();
  const accounts = await provider.listAccounts();

  if (typeof accounts === 'object' && 'error' in accounts) {
    throw new Error(accounts.error.message);
  }
  return accounts[0];
}

/** Nom de l'utilisateur — placeholder, le provider n'expose pas de nom. */
export async function getNimiqUserName(): Promise<string> {
  return 'Nimiq User';
}

/**
 * Récupère l'adresse + le nom de l'utilisateur courant.
 *
 * Hors Nimiq Pay (navigateur de dev, init rejetée), renvoie un utilisateur
 * factice pour permettre les tests. DANS Nimiq Pay, propage les erreurs (ex.
 * dialogue d'accès refusé) au lieu de les masquer.
 */
export async function getCurrentUser(): Promise<{ id: string; name: string }> {
  const provider = await getProvider();
  if (!provider) {
    return {
      id: 'dev_' + Math.random().toString(36).slice(2, 11),
      name: 'Dev User',
    };
  }

  const accounts = await provider.listAccounts();
  if (typeof accounts === 'object' && 'error' in accounts) {
    throw new Error(accounts.error.message);
  }
  const address = accounts[0];
  const name = await getNimiqUserName();
  return { id: address, name: name || 'User ' + address.slice(0, 6) };
}

/** Tronque une adresse Nimiq pour l'affichage : "NQ48 8CKH…BA76". */
export function formatAddressShort(address: string): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= 13) return clean;
  return `${clean.slice(0, 9)}…${clean.slice(-4)}`;
}

/**
 * Ouvre une demande de paiement via le provider Nimiq.
 * @param amount Montant à payer (en NIM)
 * @param recipient Adresse du bénéficiaire
 * @param reason Raison du paiement (champ `data`)
 */
export async function requestPayment(
  amount: number,
  recipient: string,
  reason: string,
): Promise<string | void> {
  const provider = await initNimiq();

  // 1 NIM = 100 000 Luna
  const valueInLunas = Math.round(amount * 100000);

  const result = await provider.sendBasicTransactionWithData({
    recipient,
    value: valueInLunas,
    data: reason,
  });

  if (typeof result === 'object' && 'error' in result) {
    throw new Error(result.error.message);
  }
  return result;
}

/** Signe un message via le provider. Renvoie publicKey + signature (hex). */
export async function signMessage(
  message: string,
): Promise<{ publicKey: string; signature: string }> {
  const provider = await initNimiq();
  const result = await provider.sign(message);
  if (typeof result === 'object' && 'error' in result) {
    throw new Error(result.error.message);
  }
  return { publicKey: result.publicKey, signature: result.signature };
}

/**
 * Check synchrone (provider déjà injecté ?). Non fiable juste après le
 * chargement — préférer `detectNimiqApp()` / l'état `isNimiqApp` du store.
 */
export function isNimiqEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.nimiq;
}
