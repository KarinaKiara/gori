import { defineStore } from 'pinia'
import localforage from 'localforage'

// "Cajón" local en el celular (IndexedDB) donde se guardan los pedidos hechos sin internet
const cola = localforage.createInstance({
  name: 'gori-chicken',
  storeName: 'pedidos_pendientes'
})

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

export const usePedidosOffline = defineStore('pedidosOffline', {
  state: () => ({
    online: navigator.onLine,   // ¿hay internet?
    pendientes: 0,              // cuántos pedidos esperan enviarse
    sincronizando: false,
    ultimoEnviado: null,        // etiqueta del último pedido que se sincronizó (para avisar)
    descartados: 0,             // pedidos que el servidor rechazó y ya no se reintentan
    motivoDescarte: ''          // por qué se descartó el último (para mostrarlo)
  }),

  actions: {
    // Arranca los escuchas de conexión y el reintento automático
    async iniciar() {
      window.addEventListener('online', () => { this.online = true; this.sincronizar() })
      window.addEventListener('offline', () => { this.online = false })
      await this.refrescar()
      // Reintento periódico: cubre también el caso "hay wifi pero el servidor no responde"
      setInterval(() => { if (this.pendientes > 0) this.sincronizar() }, 12000)
      // Intento inicial al abrir la app
      this.sincronizar()
    },

    async refrescar() {
      this.pendientes = await cola.length()
    },

    // Guarda un pedido en el cajón local (cuando no hay conexión)
    async encolar(pedido) {
      
      await cola.setItem(pedido.clienteRef, { ...pedido, guardadoEn: Date.now() })
      await this.refrescar()
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

          try {
            const res = await fetch('/api/pedidos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.token}` },
              body: JSON.stringify(p.payload)
            })

            if (res.ok) {
              await cola.removeItem(clave)
              this.ultimoEnviado = p.clienteRef
              enviados++
            } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
              // Rechazo DEFINITIVO: reintentar no lo va a arreglar.
              const err = await res.json().catch(() => ({}))
              await cola.removeItem(clave)
              this.descartados++
              this.motivoDescarte = err.error || `El servidor rechazo el pedido (${res.status})`
            }
            // 5xx, 408 y 429: el servidor esta caido o saturado -> se conserva y se reintenta.
          } catch (e) {
            // Sin red: se conserva en la cola para el proximo intento.
          }
        }
      } finally {
        this.sincronizando = false
        await this.refrescar()
      }
      return enviados
    },

    // Vacia la cola a mano. Sirve para dejar limpio un dispositivo de pruebas.
    async vaciarCola() {
      await cola.clear()
      this.descartados = 0
      this.motivoDescarte = ''
      await this.refrescar()
    }
  }
})
