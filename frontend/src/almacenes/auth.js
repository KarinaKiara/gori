import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // La sucursal se lee siempre de usuario.sucursalId; no se guarda por separado.
    usuario: JSON.parse(localStorage.getItem('usuario')) || null,
    token: localStorage.getItem('token') || null,
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
      localStorage.setItem('usuario', JSON.stringify(datosUsuario));
      localStorage.setItem('token', token);
    },
    cerrarSesion() {
      this.usuario = null;
      this.token = null;
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      localStorage.removeItem('sucursalId'); // resto de versiones anteriores
    }
  }
});
