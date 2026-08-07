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
// Además, una pestaña/acceso directo que queda abierto no se entera de un despliegue
// nuevo hasta que algo dispare la revisión. Por eso revisamos si hay versión nueva:
//   - apenas se registra, y luego cada 30 s (por si queda abierta);
//   - cada vez que la app vuelve a primer plano (abrir el acceso directo o volver a la
//     pestaña) -> así ve lo último ni bien la abre, sin recargar a mano;
//   - cuando vuelve el internet.
// Si hay versión nueva, autoUpdate la activa y recarga sola.
const CADA_30_SEG = 30 * 1000
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registro) {
    if (!registro) return
    const revisar = () => registro.update().catch(() => {})
    setInterval(revisar, CADA_30_SEG)
    // Al volver a la app (reabrir el acceso directo / volver a la pestaña)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar() })
    // Al recuperar conexión
    window.addEventListener('online', revisar)
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
