import * as Sentry from '@sentry/vue';

/**
 * Capture une erreur inattendue vers Sentry avec un contexte métier,
 * puis la relance si nécessaire. À utiliser dans les catch qui font un toast.
 */
export function captureError(err: unknown, context: string): void {
  Sentry.captureException(err, { extra: { context } });
}
