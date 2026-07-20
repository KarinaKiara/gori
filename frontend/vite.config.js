import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Reenvío (proxy): la app llama a /api y /socket.io en su propio origen,
// y Vite lo reenvía al backend. Así funciona igual en localhost, en la red WiFi
// (por la IP de la PC) o por un túnel HTTPS, sin cambiar el código.
const proxy = {
  '/api': { target: 'http://localhost:3000', changeOrigin: true },
  '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
}

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro se hace desde main.js (registerSW), que además recarga la
      // página cuando entra una versión nueva. Sin esto se inyectaría un segundo
      // registro, el de vite-plugin-pwa, que solo registra y no recarga.
      injectRegister: null,
      includeAssets: ['icono-gori.svg'],

      manifest: {
        name: 'Gori Chicken',
        short_name: 'Gori Chicken',
        description: 'Sistema de pedidos y autoservicio de Gori Chicken',
        lang: 'es',
        theme_color: '#FF4500',
        background_color: '#071d2c',
        display: 'standalone',
        orientation: 'portrait',
        // El acceso directo lo instala el CLIENTE en su celular, asi que abre el canal
        // del cliente (/pedir), donde puede elegir y cambiar de sucursal. El kiosko del
        // local (/totem) no se instala: es una tablet fija con su sesion iniciada.
        start_url: '/pedir',
        icons: [
          { src: 'icono-gori.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },

      workbox: {
        // Cachea el "esqueleto" de la app (HTML, JS, CSS, íconos) Y las fotos .webp del menú
        // para que TODO abra sin internet. Las fotos ya están optimizadas (~60KB c/u), así que
        // precargarlas es liviano (~1.5MB en total) y el menú se ve completo estando offline.
        // png incluido: el QR de pago (qr_pago.png) debe verse tambien sin internet
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2,webp,png}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        // No interceptar /api ni /socket.io con el fallback de navegación
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
        runtimeCaching: [
          {
            // Cachea el catálogo/menú del backend (mismo origen: /api/...) para mostrarlo offline
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-gori-chicken',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cachea las fotos del menú al verlas (así quedan disponibles offline luego)
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagenes-gori',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },

      devOptions: { enabled: true, type: 'module' }
    })
  ],

  // Reenvío tanto en desarrollo (npm run dev) como en la app compilada (npm run preview)
  server: { host: true, proxy },
  preview: { host: true, proxy },
})
