// ── Diálogo global de la app (reemplaza a window.confirm y window.alert) ──
// En vez de las feas ventanitas del navegador ("gori-chicken.onrender.com dice…"),
// mostramos un modal propio, con el estilo de la interfaz. Hay UNA sola instancia
// (el componente DialogoGlobal.vue montado en App.vue) que lee este estado compartido.
//
// Uso:
//   import { confirmar, avisar } from '@/utilidades/dialogo'
//   if (!(await confirmar('¿Eliminar al proveedor?'))) return   // botón Aceptar/Cancelar
//   await avisar('Tu carrito está vacío')                        // un solo botón
import { reactive } from 'vue'

// Estado que el componente DialogoGlobal.vue observa y dibuja.
export const estadoDialogo = reactive({
  visible: false,
  tipo: 'confirmar', // 'confirmar' (Aceptar/Cancelar) | 'aviso' (un solo botón)
  titulo: '',
  mensaje: '',
  textoAceptar: 'Aceptar',
  textoCancelar: 'Cancelar',
  peligro: false, // true = acción destructiva (botón rojo: eliminar, cancelar pedido…)
  _resolver: null,
})

// Abre el modal y devuelve una promesa que se resuelve cuando el usuario responde.
function abrir(opciones) {
  return new Promise((resolve) => {
    // Cierra cualquier diálogo previo sin respuesta (por las dudas)
    if (estadoDialogo._resolver) estadoDialogo._resolver(false)
    Object.assign(estadoDialogo, {
      visible: true,
      tipo: 'confirmar',
      titulo: '',
      mensaje: '',
      textoAceptar: 'Aceptar',
      textoCancelar: 'Cancelar',
      peligro: false,
      ...opciones,
      _resolver: resolve,
    })
  })
}

// Reemplaza a window.confirm. Devuelve Promise<boolean> (true = Aceptar).
export function confirmar(mensaje, opciones = {}) {
  return abrir({ tipo: 'confirmar', mensaje, ...opciones })
}

// Reemplaza a window.alert. Un solo botón. Devuelve Promise<void>.
export function avisar(mensaje, opciones = {}) {
  return abrir({ tipo: 'aviso', mensaje, textoAceptar: 'Entendido', ...opciones })
}

// Lo llama DialogoGlobal.vue cuando el usuario toca un botón (o Escape / fondo).
export function responderDialogo(valor) {
  estadoDialogo.visible = false
  const resolver = estadoDialogo._resolver
  estadoDialogo._resolver = null
  if (resolver) resolver(valor)
}
