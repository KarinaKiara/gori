import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './rutas'
import './assets/style.css'
import App from './App.vue'
import './almacenes/totem' // corre la migración de sesión del tótem antes de montar

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
