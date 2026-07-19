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
      const isNimiqSdkRejection = event.exception?.values?.some(
        (exception) =>
          exception.type === 'UnhandledRejection' &&
          typeof exception.value === 'string' &&
          exception.value.includes('Failed to send payment transaction'),
      );
      return isNimiqSdkRejection ? null : event;
    },
  });
}

app.use(i18n);
app.use(router);
applyTheme();
app.mount('#app');
