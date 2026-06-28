import vue from '@vitejs/plugin-vue';
import nimiq from '@nimiq/core/vite';
import { defineConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

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
    }),
  ],
  build: {
    sourcemap: 'hidden',
  },
  server: {
    port: 5173,
    host: true,
  },
});
