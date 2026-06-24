import { init } from '@nimiq/mini-app-sdk';
import type { NimiqProvider } from '@nimiq/mini-app-sdk';

// Instance du provider Nimiq
let nimiqProvider: NimiqProvider | null = null;

/**
 * Initialise le provider Nimiq
 */
export async function initNimiq(): Promise<NimiqProvider> {
  if (nimiqProvider) return nimiqProvider;
  
  nimiqProvider = await init();
  return nimiqProvider;
}

/**
 * Récupère l'adresse Nimiq de l'utilisateur courant
 */
export async function getNimiqAddress(): Promise<string> {
  const provider = await initNimiq();
  const accounts = await provider.listAccounts();
  
  // Gérer la réponse qui peut être une ErrorResponse
  if (typeof accounts === 'object' && 'error' in accounts) {
    throw new Error(accounts.error.message);
  }
  
  return accounts[0];
}

/**
 * Récupère le nom de l'utilisateur courant
 */
export async function getNimiqUserName(): Promise<string> {
  // Pour le moment, on utilise une valeur par défaut
  // En production, on pourrait récupérer le nom depuis le provider
  return 'Nimiq User';
}

/**
 * Récupère à la fois l'adresse et le nom de l'utilisateur.
 *
 * Hors environnement Nimiq (navigateur de dev), renvoie un utilisateur factice
 * pour permettre les tests. DANS Nimiq Pay, propage les erreurs (ex. dialogue
 * d'accès refusé) au lieu de les masquer — l'appelant doit pouvoir réagir.
 */
export async function getCurrentUser(): Promise<{ id: string; name: string }> {
  if (!isNimiqEnvironment()) {
    return {
      id: 'dev_' + Math.random().toString(36).slice(2, 11),
      name: 'Dev User',
    };
  }

  const address = await getNimiqAddress();
  const name = await getNimiqUserName();
  return {
    id: address,
    name: name || 'User ' + address.slice(0, 6),
  };
}

/**
 * Tronque une adresse Nimiq pour l'affichage : "NQ48 8CKH…BA76".
 */
export function formatAddressShort(address: string): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= 13) return clean;
  return `${clean.slice(0, 9)}…${clean.slice(-4)}`;
}

/**
 * Ouvre une demande de paiement via le SDK Nimiq
 * @param amount Montant à payer (en NIM)
 * @param recipient Adresse du bénéficiaire
 * @param reason Raison du paiement
 */
export async function requestPayment(
  amount: number,
  recipient: string,
  reason: string
): Promise<string | void> {
  const provider = await initNimiq();
  
  // Convertir le montant en Lunas (1 NIM = 100000 Lunas)
  const valueInLunas = Math.round(amount * 100000);
  
  // Utiliser sendBasicTransactionWithData pour envoyer le paiement
  const result = await provider.sendBasicTransactionWithData({
    recipient,
    value: valueInLunas,
    data: reason
  });
  
  // Gérer la réponse qui peut être une ErrorResponse
  if (typeof result === 'object' && 'error' in result) {
    throw new Error(result.error.message);
  }
  
  return result;
}

/**
 * Vérifie si l'app est exécutée dans un environnement Nimiq
 */
export function isNimiqEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.nimiq;
}
