import { Vue, createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App)

app.use(pinia)
app.mount('#app')
