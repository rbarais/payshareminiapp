import vue from '@vitejs/plugin-vue';
import nimiq from '@nimiq/core/vite';
import { defineConfig, loadEnv } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import svgLoader from 'vite-svg-loader';

export default defineConfig({
  // Le plugin Nimiq configure WASM + workers requis par le Web Client (@nimiq/core)
  plugins: [
    vue(),
    nimiq(),
    sentryVitePlugin({
      org: 'payshare',
      project: 'sentry-payshare',
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/assets/*.map'],
      },
      telemetry: false,
    }),
  ],
  build: {
    sourcemap: 'hidden',
  },
  server: {
    port: 5173,
    host: true,
  },
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Cible du proxy /api en dev : le backend Vercel déjà déployé.
  // Surchargeable via VITE_API_PROXY_TARGET dans .env.local.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'https://payshareminiapp.vercel.app';

  return {
    // Le plugin Nimiq configure WASM + workers requis par le Web Client (@nimiq/core)
    plugins: [
      vue(),
      nimiq(),
      svgLoader(),
      sentryVitePlugin({
        org: 'payshare',
        project: 'sentry-payshare',
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/assets/*.map'],
        },
        telemetry: false,
      }),
    ],
    build: {
      sourcemap: 'hidden',
    },

    server: {
      port: 5173,
      host: true,
      // En dev, les appels /api (chemins relatifs) sont proxifiés vers le
      // backend Vercel déployé — pratique pour tester le front sur mobile.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
