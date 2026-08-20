import { defineStore } from 'pinia'
import localforage from 'localforage'

// "Cajón" local en el celular (IndexedDB) donde se guardan los pedidos hechos sin internet
const cola = localforage.createInstance({
  name: 'gori-chicken',
  storeName: 'pedidos_pendientes'
})

// ── Bloqueo del tótem cuando el corte deja de ser un parpadeo ──
// Un corte corto no molesta a nadie: el pedido se guarda y se envía solo. Pero en un
// corte LARGO el tótem estaría prometiendo comida que la cocina no está recibiendo,
// así que se bloquea y se manda al cliente a la caja, que está ahí mismo.
const MIN_SIN_SERVIDOR = 3 * 60 * 1000  // 3 minutos sin que el servidor responda
const MAX_PENDIENTES   = 2              // o 2 pedidos que no llegaron a la cocina
const CADA_30_SEG      = 30 * 1000

// En el celular del cliente no se bloquea nada (puede estar en su casa): en vez de eso,
// si su pedido lleva demasiado sin poder enviarse, se le avisa para que revise su señal.
// Un solo aviso no alcanza: si lo cierra y sigue sin señal, se le recuerda unas veces
// más y después se deja de insistir (a los 15 minutos, o reacciona o ya no lo hará).
const MIN_DEMORA        = 3 * 60 * 1000
const CADA_RECORDATORIO = 3 * 60 * 1000
const MAX_AVISOS        = 5   // avisos a los 3, 6, 9, 12 y 15 minutos

// El bloqueo es SOLO para el tótem-kiosko del local. En el celular del cliente no
// aplica: esa persona puede estar en su casa y no tiene una caja al lado.
const esKiosko  = () => localStorage.getItem('totem_modo') === 'kiosko'
const esCliente = () => !esKiosko()

// Código corto del pedido: los 4 últimos caracteres de su etiqueta única. Es lo que ve
// el cliente mientras el servidor no le haya asignado turno.
export function codigoCorto(clienteRef) {
  return String(clienteRef).replace(/-/g, '').slice(-4).toUpperCase()
}

// Pide permiso para las notificaciones del sistema. DEBE llamarse desde un toque del
// usuario (Safari lo exige), por eso se dispara desde un botón del comprobante.
export async function pedirPermisoNotificaciones() {
  try {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    return (await Notification.requestPermission()) === 'granted'
  } catch (e) { return false }
}

// Notificación del sistema (la que suena aunque la app esté en segundo plano).
// Solo sale si el cliente dio permiso; si no, queda el aviso dentro de la app.
async function notificar(titulo, cuerpo) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const opciones = {
      body: cuerpo,
      icon: '/icono-gori.svg',
      badge: '/icono-gori.svg',
      vibrate: [200, 100, 200],
      tag: 'gori-pedido'   // reemplaza al aviso anterior en vez de apilarlos
    }
    const registro = await navigator.serviceWorker?.getRegistration()
    if (registro) await registro.showNotification(titulo, opciones)
    else new Notification(titulo, opciones)
  } catch (e) { /* el navegador no lo permitió: no es crítico */ }
}

// Genera una etiqueta única para cada pedido (idempotencia). crypto.randomUUID sólo existe
// en contextos seguros (https/localhost); si no, usamos un respaldo.
export function nuevaEtiqueta() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// El pedido que lleva más tiempo esperando en la cola (null si no hay ninguno).
async function pedidoMasViejo() {
  const claves = await cola.keys()
  let masViejo = null
  for (const clave of claves) {
    const p = await cola.getItem(clave)
    if (!p || !p.guardadoEn) continue
    if (!masViejo || p.guardadoEn < masViejo.guardadoEn) masViejo = p
  }
  return masViejo
}

// Un pedido hecho sin internet sale SIN turno (el servidor es el único que puede
// repartirlos sin que dos clientes reciban el mismo número). En cuanto llega, el
// servidor le asigna el suyo: acá se escribe en el comprobante que quedó guardado en
// este celular, para que el cliente pase de ver su código a ver su turno real solo.
function anotarTurnoEnComprobante(clienteRef, numeroPedido) {
  if (!numeroPedido) return
  try {
    const c = JSON.parse(localStorage.getItem('gori_comprobante') || 'null')
    if (!c || c.clienteRef !== clienteRef) return
    c.turno = numeroPedido
    c.offline = false
    localStorage.setItem('gori_comprobante', JSON.stringify(c))
  } catch (e) { /* comprobante corrupto o almacenamiento lleno: no es crítico */ }
}

export const usePedidosOffline = defineStore('pedidosOffline', {
  state: () => ({
    online: navigator.onLine,   // ¿hay internet?
    pendientes: 0,              // cuántos pedidos esperan enviarse
    sincronizando: false,
    descartados: 0,             // pedidos que el servidor rechazó y ya no se reintentan
    motivoDescarte: '',         // por qué se descartó el último (para mostrarlo)
    alcanzable: true,           // ¿el servidor responde DE VERDAD? (no lo que dice el navegador)
    sinServidorDesde: null,     // desde cuándo no responde (null = responde bien)
    bloqueado: false,           // true = el tótem tapa la pantalla y manda a la caja
    demorado: null,             // { clienteRef, codigo } del pedido que tarda demasiado
    avisadoDe: null,            // de cuál ya se avisó (para no empezar de cero cada vuelta)
    avisosDados: 0,             // cuántos avisos se mandaron por ese pedido
    ultimoAviso: 0              // cuándo fue el último, para espaciar los recordatorios
  }),

  actions: {
    // Arranca los escuchas de conexión y el reintento automático.
    // Se intenta sincronizar en cada momento en que la app "revive": al volver la
    // conexión, al reabrirla, al recuperar el foco de la pestaña y periódicamente.
    // Cuantos más disparadores, menos depende de que el usuario haga algo.
    async iniciar() {
      // Al "revivir" la app: se reintenta el envío, se vuelve a preguntar al servidor
      // (para que el tótem se destape al instante en vez de esperar los 30 s) y, si el
      // pedido del cliente sigue atascado, se le muestra el aviso de inmediato. Volver a
      // la app es el único momento en que su atención está garantizada: en segundo plano
      // el sistema pudo haber congelado la aplicación sin avisarle nada.
      const intentar = () => {
        this.online = navigator.onLine
        this.comprobarServidor()
        this.mostrarSiSigueDemorado()
        if (this.pendientes > 0) this.sincronizar()
      }

      window.addEventListener('online', () => { this.online = true; this.comprobarServidor(); this.sincronizar() })
      window.addEventListener('offline', () => { this.online = false })

      // Al volver a la pestaña (cambió de app y regresó, o desbloqueó el celular)
      window.addEventListener('focus', intentar)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') intentar() })

      await this.refrescar()
      // Reintento periódico: cubre "hay wifi pero el servidor no responde" y el
      // servidor de Render que estaba dormido y tarda en despertar.
      setInterval(() => { if (this.pendientes > 0) this.sincronizar() }, 10000)
      // Intento inicial al abrir la app
      this.sincronizar()

      // Vigilancia del servidor para poder bloquear el tótem. El temporizador arranca
      // siempre y es comprobarServidor() quien decide si corresponde: el modo kiosko se
      // marca al iniciar sesión, o sea DESPUÉS de que la app arrancó, así que no se
      // puede decidir aquí una sola vez.
      this.comprobarServidor()
      setInterval(() => this.comprobarServidor(), CADA_30_SEG)
    },

    async refrescar() {
      this.pendientes = await cola.length()
      this.evaluarBloqueo()
    },

    // ¿El servidor responde? navigator.onLine NO sirve para esto: dice "hay internet"
    // aunque el WiFi del local no tenga salida o el servidor esté dormido, que son
    // justo los dos casos que hay que detectar. Por eso se le pregunta al servidor.
    async comprobarServidor() {
      // En el celular del cliente no se comprueba nada: no se bloquea y no tiene sentido
      // gastarle datos. Se consulta en cada vuelta porque el modo puede cambiar en caliente.
      if (!esKiosko()) { this.bloqueado = false; return }

      const corte = new AbortController()
      const temporizador = setTimeout(() => corte.abort(), 5000)
      try {
        // El parámetro variable evita que cualquier caché (navegador o Service Worker)
        // conteste por el servidor y haga creer que hay conexión cuando no la hay.
        const res = await fetch(`/api/salud?t=${Date.now()}`, { cache: 'no-store', signal: corte.signal })
        if (!res.ok) throw new Error('el servidor respondió mal')
        this.alcanzable = true
        this.sinServidorDesde = null
      } catch (e) {
        this.alcanzable = false
        if (!this.sinServidorDesde) this.sinServidorDesde = Date.now()
      } finally {
        clearTimeout(temporizador)
        this.evaluarBloqueo()
      }
    },

    // Decide si el tótem debe taparse. Los pedidos acumulados solo cuentan mientras el
    // servidor sigue caído: si ya volvió, esos pedidos están por enviarse y no hay
    // motivo para bloquear.
    // ── Aviso al cliente cuando su pedido tarda demasiado ──
    // El tótem se bloquea; el celular no. Aquí el problema es otro: el cliente guarda
    // el celular en el bolsillo y no se entera de que su pedido nunca salió. Si el más
    // antiguo de la cola lleva 3 minutos esperando, se le avisa UNA vez.
    async evaluarDemora() {
      if (!esCliente()) { this.demorado = null; return }

      const masViejo = await pedidoMasViejo()
      if (!masViejo) { this.demorado = null; return }
      if (Date.now() - masViejo.guardadoEn < MIN_DEMORA) return

      // Primer aviso: modal + notificación. Es el que interrumpe.
      if (this.avisadoDe !== masViejo.clienteRef) {
        this.avisadoDe = masViejo.clienteRef
        this.avisosDados = 1
        this.ultimoAviso = Date.now()
        this.demorado = { clienteRef: masViejo.clienteRef, codigo: codigoCorto(masViejo.clienteRef) }
        notificar('Tu pedido aún no se envió',
          'Revisa tu conexión a internet. Tu pedido está guardado y se enviará solo al volver la señal.')
        return
      }

      // Recordatorios: solo notificación, sin volver a taparle la pantalla.
      if (this.avisosDados < MAX_AVISOS && Date.now() - this.ultimoAviso >= CADA_RECORDATORIO) {
        this.avisosDados++
        this.ultimoAviso = Date.now()
        notificar('Tu pedido sigue sin enviarse',
          'Sin internet no podemos mandarlo a la cocina. Revisa tu conexión.')
      }
    },

    // Cuando el cliente vuelve a la app, si su pedido sigue atascado se le muestra el
    // aviso de inmediato. Es el único momento en que tenemos su atención asegurada: en
    // segundo plano el sistema puede haber congelado la app y no haberle avisado nada.
    async mostrarSiSigueDemorado() {
      if (!esCliente() || this.demorado) return
      const masViejo = await pedidoMasViejo()
      if (!masViejo) return
      if (Date.now() - masViejo.guardadoEn < MIN_DEMORA) return
      this.demorado = { clienteRef: masViejo.clienteRef, codigo: codigoCorto(masViejo.clienteRef) }
    },

    // El cliente cerró el aviso. Los recordatorios siguen, pero ya no se le tapa la pantalla.
    cerrarAvisoDemora() {
      this.demorado = null
    },

    evaluarBloqueo() {
      if (!esKiosko()) { this.bloqueado = false; return }
      const demasiadoTiempo = this.sinServidorDesde !== null &&
        (Date.now() - this.sinServidorDesde) >= MIN_SIN_SERVIDOR
      const demasiadosPedidos = !this.alcanzable && this.pendientes >= MAX_PENDIENTES
      this.bloqueado = demasiadoTiempo || demasiadosPedidos
    },

    // Guarda un pedido en el cajón local (cuando no hay conexión)
    async encolar(pedido) {
      await cola.setItem(pedido.clienteRef, { ...pedido, guardadoEn: Date.now() })

      // Si un pedido llegó hasta acá es porque el envío ACABA de fallar: eso es prueba
      // directa de que el servidor no está alcanzable, mejor que esperar hasta 30 s a la
      // siguiente comprobación. Así el tótem se bloquea apenas se acumulan los pedidos,
      // que es lo que se espera de la regla.
      this.alcanzable = false
      if (!this.sinServidorDesde) this.sinServidorDesde = Date.now()

      await this.refrescar()   // refrescar() reevalúa el bloqueo con el dato ya corregido
    },

    // Intenta enviar todos los pedidos guardados.
    // Se sacan de la cola tanto los que el servidor ACEPTA como los que RECHAZA de forma
    // definitiva. Antes solo se quitaban los aceptados, y un pedido rechazado (token
    // vencido, sucursal cerrada, producto que ya no existe) se quedaba atascado para
    // siempre, reintentandose cada 12 segundos y mostrando "N guardados" sin fin.
    async sincronizar() {
      if (this.sincronizando) return
      this.sincronizando = true
      let enviados = 0
      try {
        const claves = await cola.keys()
        for (const clave of claves) {
          const p = await cola.getItem(clave)
          if (!p) continue

          // Caduco: los turnos se reinician cada dia, un pedido de ayer ya no tiene sentido.
          if (p.guardadoEn && Date.now() - p.guardadoEn > 24 * 60 * 60 * 1000) {
            await cola.removeItem(clave)
            this.descartados++
            this.motivoDescarte = 'Pedido vencido (mas de un dia sin enviarse)'
            continue
          }

          // Tiempo límite: sin esto, con WiFi que no llega a internet el envío se queda
          // colgado y bloquea los reintentos siguientes, con lo que el aviso de demora
          // al cliente llegaría tarde justo cuando más falta hace.
          const corte = new AbortController()
          const temporizador = setTimeout(() => corte.abort(), 8000)
          try {
            const res = await fetch('/api/pedidos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.token}` },
              body: JSON.stringify(p.payload),
              signal: corte.signal
            })

            if (res.ok) {
              // El servidor devuelve el pedido ya creado (o el que existía, si era un
              // reenvío): de ahí sale el turno definitivo para el comprobante.
              const creado = await res.json().catch(() => null)
              anotarTurnoEnComprobante(p.clienteRef, creado?.numeroPedido)
              // Si al cliente se le avisó que su pedido estaba demorado, hay que cerrarle
              // el círculo: se quedó preocupado y merece saber que ya entró a cocina.
              if (this.avisadoDe === p.clienteRef) {
                this.avisadoDe = null
                this.avisosDados = 0
                this.demorado = null
                notificar('Tu pedido ya se envió',
                  creado?.numeroPedido
                    ? `Está en cocina. Tu turno es el ${creado.numeroPedido}.`
                    : 'Ya está en cocina.')
              }
              await cola.removeItem(clave)
              enviados++
            } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
              // Rechazo DEFINITIVO: reintentar no lo va a arreglar.
              const err = await res.json().catch(() => ({}))
              await cola.removeItem(clave)
              this.descartados++
              this.motivoDescarte = err.error || `El servidor rechazo el pedido (${res.status})`
              // El cliente creía que tenía un pedido en camino y resulta que no. Es lo
              // más importante que se le puede avisar, así que va también por notificación.
              if (this.avisadoDe === p.clienteRef) { this.avisadoDe = null; this.avisosDados = 0; this.demorado = null }
              notificar('Tu pedido no se pudo registrar',
                `${this.motivoDescarte}. Acércate a la Caja para hacerlo ahí.`)
            }
            // 5xx, 408 y 429: el servidor esta caido o saturado -> se conserva y se reintenta.
          } catch (e) {
            // Sin red o se acabó el tiempo: se conserva en la cola para el proximo intento.
          } finally {
            clearTimeout(temporizador)
          }
        }
      } finally {
        this.sincronizando = false
        await this.refrescar()
        await this.evaluarDemora()
      }
      return enviados
    }
  }
})
