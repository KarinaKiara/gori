import { createRouter, createWebHistory } from 'vue-router'
import Home from '../vistas/Home.vue'
import TotemBienvenida from '../vistas/Totem/Bienvenida.vue'
import TotemMenu from '../vistas/Totem/MenuDigital.vue'
import TotemCarrito from '../vistas/Totem/Carrito.vue'
import TotemPago from '../vistas/Totem/Pago.vue'
import Login from '../vistas/Login.vue'
import CajaLayout from '../vistas/POS/CajaLayout.vue'
import CocinaLayout from '../vistas/KDS/CocinaLayout.vue'
import AdminLayout from '../vistas/Admin/AdminLayout.vue'
import GerenteLayout from '../vistas/Admin/GerenteLayout.vue'
import Forbidden from '../vistas/Forbidden.vue'
import { useAuthStore } from '../almacenes/auth'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/forbidden', name: 'Forbidden', component: Forbidden },

  // Rutas del Tótem (acceso libre — el login del tótem es automático)
  { path: '/totem',          name: 'TotemBienvenida', component: TotemBienvenida },
  { path: '/totem/menu',     name: 'TotemMenu',       component: TotemMenu },
  { path: '/totem/carrito',  name: 'TotemCarrito',    component: TotemCarrito },
  { path: '/totem/pago',     name: 'TotemPago',        component: TotemPago },

  // Rutas protegidas por rol
  {
    path: '/pos',
    name: 'POS',
    component: CajaLayout,
    meta: { requiresAuth: true, roles: ['CAJERO', 'ADMIN'] }
  },
  {
    path: '/kds',
    name: 'KDS',
    component: CocinaLayout,
    meta: { requiresAuth: true, roles: ['COCINERO', 'ADMIN'] }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminLayout,
    meta: { requiresAuth: true, roles: ['ADMIN'] }
  },
  {
    path: '/gerente',
    name: 'Gerente',
    component: GerenteLayout,
    meta: { requiresAuth: true, roles: ['GERENTE'] }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 1. Si la ruta requiere autenticación y no hay token → Login
  if (to.meta.requiresAuth && !authStore.token) {
    return next({ name: 'Login' })
  }

  // 2. Si la ruta tiene roles permitidos, verificar si el usuario los tiene
  if (to.meta.roles && to.meta.roles.length > 0) {
    const rolUsuario = authStore.usuario?.rol
    if (!rolUsuario || !to.meta.roles.includes(rolUsuario)) {
      // Redirigir a la página de Acceso Denegado (403)
      return next({ name: 'Forbidden' })
    }
  }

  // 3. Todo correcto → continuar
  next()
})

export default router
