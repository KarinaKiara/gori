import { defineStore } from 'pinia'

// El tótem guarda su sesión en llaves PROPIAS (totem_*), separadas de las de los
// operadores (token/usuario). Así el tótem y el gerente/caja pueden convivir en el
// mismo navegador sin pisarse la sesión.

// Migración suave: si un tótem ya configurado dejó su sesión en las llaves antiguas
// (token/usuario con rol TOTEM), la movemos a las llaves del tótem y limpiamos las
// antiguas, para que no interfiera con la sesión de un operador.
function migrarLegacy() {
  if (localStorage.getItem('totem_token')) return
  try {
    const t = localStorage.getItem('token')
    const u = JSON.parse(localStorage.getItem('usuario'))
    if (t && u && u.rol === 'TOTEM') {
      localStorage.setItem('totem_token', t)
      localStorage.setItem('totem_usuario', JSON.stringify(u))
      if (u.sucursalId) localStorage.setItem('totem_sucursalId', u.sucursalId)
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    }
  } catch (e) { /* localStorage corrupto: se ignora y el tótem pedirá configurarse */ }
}
migrarLegacy()

export const useTotemStore = defineStore('totem', {
  state: () => ({
    usuario: JSON.parse(localStorage.getItem('totem_usuario')) || null,
    sucursalId: localStorage.getItem('totem_sucursalId') || null,
    token: localStorage.getItem('totem_token') || null,
  }),
  actions: {
    async login(correo, contrasena) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, contrasena })
        })
        if (!response.ok) return false
        const data = await response.json()
        this.iniciarSesion(data.usuario, data.token)
        return true
      } catch (error) {
        console.error('Error al autenticar el tótem:', error)
        return false
      }
    },
    iniciarSesion(datosUsuario, token) {
      this.usuario = datosUsuario
      this.token = token
      localStorage.setItem('totem_usuario', JSON.stringify(datosUsuario))
      localStorage.setItem('totem_token', token)
      if (datosUsuario.sucursalId) {
        this.sucursalId = datosUsuario.sucursalId
        localStorage.setItem('totem_sucursalId', datosUsuario.sucursalId)
      }
    },
    cerrarSesion() {
      this.usuario = null
      this.token = null
      localStorage.removeItem('totem_usuario')
      localStorage.removeItem('totem_token')
    }
  }
})
