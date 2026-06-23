import vue from '@vitejs/plugin-vue'
import nimiq from '@nimiq/core/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Le plugin Nimiq configure WASM + workers requis par le Web Client (@nimiq/core)
  plugins: [vue(), nimiq()],
  server: {
    port: 5173,
    host: true,
  },
})
