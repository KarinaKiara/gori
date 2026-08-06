import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import router from './rutas'
import './assets/style.css'
import App from './App.vue'
import './almacenes/totem' // corre la migración de sesión del tótem antes de montar

// El navegador avisa "esta app se puede instalar" con el evento beforeinstallprompt.
// Ese aviso puede llegar ANTES de que monte el componente de instalar, y si nadie lo
// atrapó, se pierde (y el usuario cae en las instrucciones de "3 puntos"). Por eso lo
// capturamos acá, apenas arranca todo, y lo guardamos para que InstalarApp.vue lo use
// y ofrezca el botón "Instalar" de un toque, como antes.
window.__promptInstalar = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__promptInstalar = e
  window.dispatchEvent(new Event('gori-instalable'))
})
window.addEventListener('appinstalled', () => { window.__promptInstalar = null })

// Mantiene la app al día sin que nadie tenga que recargar a mano.
//
// Antes solo se registraba el service worker: la versión nueva se instalaba en
// segundo plano, pero la pantalla seguía mostrando la vieja hasta la SIGUIENTE
// recarga. En un navegador normal eso obligaba a recargar dos veces (en incógnito
// no se notaba, porque ahí nunca hay una versión guardada de antes).
//
// Con esto, en cuanto la versión nueva toma el control, la página se recarga sola.
//
// Además, una pestaña que queda ABIERTA no se entera de un despliegue nuevo hasta
// la siguiente recarga. Por eso, cada 30 s le pedimos al service worker que revise
// si hay versión nueva (r.update()); si la hay, autoUpdate la activa y recarga sola.
// Así el admin/gerente ve los cambios sin tener que refrescar a mano.
const CADA_30_SEG = 30 * 1000
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registro) {
    if (!registro) return
    setInterval(() => { registro.update().catch(() => {}) }, CADA_30_SEG)
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
