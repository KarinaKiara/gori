import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import router from './rutas'
import './assets/style.css'
import App from './App.vue'
import './almacenes/totem' // corre la migración de sesión del tótem antes de montar

// Mantiene la app al día sin que nadie tenga que recargar a mano.
//
// Antes solo se registraba el service worker: la versión nueva se instalaba en
// segundo plano, pero la pantalla seguía mostrando la vieja hasta la SIGUIENTE
// recarga. En un navegador normal eso obligaba a recargar dos veces (en incógnito
// no se notaba, porque ahí nunca hay una versión guardada de antes).
//
// Con esto, en cuanto la versión nueva toma el control, la página se recarga sola.
registerSW({ immediate: true })

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
