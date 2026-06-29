import { createApp } from 'vue';
import * as Sentry from '@sentry/vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { applyTheme } from './stores/prefs';

const app = createApp(App);

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
  });
}

app.use(router);
applyTheme();
app.mount('#app');
