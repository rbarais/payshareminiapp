import { i18n } from '.';
import type { Locale } from '../utils/prefsStorage';

// URL du Content Delivery Tolgee (publique, pas de clé). Non définie → no-op :
// l'app reste sur les traductions bundlées (src/i18n/*.json).
const CDN = import.meta.env.VITE_TOLGEE_CDN_URL as string | undefined;

async function fetchLocale(locale: Locale): Promise<void> {
  try {
    const res = await fetch(`${CDN}/${locale}.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    // mergeLocaleMessage (et non setLocaleMessage) : on superpose les trads du CDN
    // sur le bundle, donc une clé absente du CDN garde sa valeur bundlée au lieu
    // de disparaître.
    i18n.global.mergeLocaleMessage(locale, await res.json());
  } catch {
    /* réseau KO (offline WebView, CDN down) → on garde le bundle, silencieux */
  }
}

/**
 * Rafraîchit les traductions depuis Tolgee au démarrage, sans bloquer l'affichage :
 * l'app est déjà montée avec les trads bundlées, et vue-i18n met à jour l'UI de
 * façon réactive dès que le fetch aboutit. On hydrate la langue active + le
 * fallback `fr`.
 */
export async function hydrateFromTolgee(): Promise<void> {
  if (!CDN) return;
  const active = i18n.global.locale.value as Locale;
  const locales = Array.from(new Set<Locale>([active, 'fr']));
  await Promise.all(locales.map(fetchLocale));
}
