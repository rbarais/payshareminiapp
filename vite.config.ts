import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

export default defineConfig({
  // HTTPS requis pour l'accès caméra (getUserMedia) sur mobile via IP réseau
  plugins: [vue(), basicSsl()],
  server: {
    port: 5173,
    host: true,
  },
})
