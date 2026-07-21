import { defineStore } from 'pinia'

// La sesión de los OPERADORES (admin, gerente, cajero, cocinero) vive en
// sessionStorage, que es PROPIO DE CADA PESTAÑA. Así se pueden abrir la caja, la
// cocina y el panel del gerente al mismo tiempo en el mismo navegador sin que un
// login pise al otro (antes compartían localStorage y el segundo rol dejaba al
// primero con un 403 al recargar).
//
// El tótem NO usa este almacén: guarda su sesión en localStorage con llaves
// propias (totem_*), porque es un kiosko fijo que debe seguir logueado aunque se
// reinicie la tablet.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: JSON.parse(sessionStorage.getItem('usuario')) || null,
    token: sessionStorage.getItem('token') || null,
  }),
  actions: {
    async login(correo, contrasena) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, contrasena })
        });

        if (!response.ok) return false;

        const data = await response.json();
        this.iniciarSesion(data.usuario, data.token);
        return true;
      } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return false;
      }
    },
    iniciarSesion(datosUsuario, token) {
      this.usuario = datosUsuario;
      this.token = token;
      sessionStorage.setItem('usuario', JSON.stringify(datosUsuario));
      sessionStorage.setItem('token', token);
    },
    cerrarSesion() {
      this.usuario = null;
      this.token = null;
      sessionStorage.removeItem('usuario');
      sessionStorage.removeItem('token');
      // Restos de versiones anteriores que guardaban la sesión en localStorage
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      localStorage.removeItem('sucursalId');
    }
  }
});
