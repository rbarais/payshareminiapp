export {};

declare global {
  interface Window {
    // Exposé par Nimiq Pay : langue UI sélectionnée (ISO 639-1, ex. 'fr', 'de').
    // Injecté avant l'exécution des scripts de page, lecture seule.
    nimiqPay?: {
      language?: string;
    };
  }
}
