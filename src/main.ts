import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Initialisation de l'application
const app = createApp(App)

// Utilisation du router
app.use(router)

// Montage de l'app
app.mount('#app')
