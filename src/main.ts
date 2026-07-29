import { createApp } from 'vue';
import * as Sentry from '@sentry/vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { i18n } from './i18n';
import { hydrateFromTolgee } from './i18n/hydrate';
import { applyTheme } from './stores/prefs';

const app = createApp(App);

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
    beforeSend(event) {
      const values = event.exception?.values ?? [];

      const isNimiqSdkRejection = values.some(
        (exception) =>
          exception.type === 'UnhandledRejection' &&
          typeof exception.value === 'string' &&
          exception.value.includes('Failed to send payment transaction'),
      );

      const isExtensionNoise = values.some((exception) =>
        exception.stacktrace?.frames?.some((frame) =>
          frame.filename?.startsWith('chrome-extension://'),
        ),
      );

      // EIP-1193 disconnect codes: injected wallet extensions reject with a bare
      // object, so the only reliable signal is the serialized payload.
      const serialized = event.extra?.__serialized__ as
        { code?: unknown; stack?: unknown } | undefined;
      const isProviderDisconnect = serialized?.code === 4900 || serialized?.code === 4901;
      const isExtensionStack =
        typeof serialized?.stack === 'string' && serialized.stack.includes('chrome-extension://');

      return isNimiqSdkRejection || isExtensionNoise || isProviderDisconnect || isExtensionStack
        ? null
        : event;
    },
  });
}

app.use(i18n);
app.use(router);
applyTheme();
app.mount('#app'); // rendu instantané avec les traductions bundlées
void hydrateFromTolgee(); // puis mise à jour depuis Tolgee en tâche de fond
