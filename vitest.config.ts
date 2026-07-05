import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'api/**/*.test.ts', 'server/**/*.test.ts'],
    environmentMatchGlobs: [
      ['api/**/*.test.ts', 'node'],
      ['server/**/*.test.ts', 'node'],
      ['src/**/*.test.ts', 'jsdom'],
    ],
  },
});
