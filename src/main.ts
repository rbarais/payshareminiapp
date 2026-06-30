import { createApp } from 'vue';
import * as Sentry from '@sentry/vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { i18n } from './i18n';
import { applyTheme } from './stores/prefs';

const app = createApp(App);

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
    beforeSend(event) {
      // The Nimiq Pay SDK's CallbackAdapter creates a secondary internal Promise
      // when a transaction fails. This floating Promise rejects with the raw
      // JSON-RPC error before we can attach a handler — it's a SDK bug we can't
      // fix. The rejection IS already caught and shown to the user in PayView,
      // so we drop the duplicate unhandledrejection event here.
      const isNimiqSdkRejection = event.exception?.values?.some(
        (v) =>
          v.type === 'UnhandledRejection' &&
          typeof v.value === 'string' &&
          v.value.includes('Failed to send payment transaction'),
      );
      return isNimiqSdkRejection ? null : event;
    },
  });
}

app.use(i18n);
app.use(router);
applyTheme();
app.mount('#app');
