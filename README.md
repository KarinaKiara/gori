# 🍗 Gori Chicken — Sistema de Gestión de Pedidos e Inventario

Sistema de gestión de pedidos y control de inventarios por recetas bajo un modelo **multi-tenant** con soporte **offline-first (PWA)**. Proyecto de grado — Escuela Militar de Ingeniería (EMI).

Caso de estudio: cadena de restaurantes **Gori Chicken**.

## ✨ Características

- **Multi-tenant**: cada sucursal maneja su propio inventario, recetas, personal y reportes de forma aislada.
- **Tótem de autoservicio (PWA)**: el cliente pide desde una pantalla táctil o su celular; funciona **sin internet** y sincroniza al reconectar.
- **KDS (Kitchen Display System)**: la cocina ve las comandas en tiempo real (WebSockets) con **alertas de tiempo** (semáforo de espera y límite de preparación).
- **Inventario por recetas**: al vender un plato, se descuentan los insumos **exactos** (incluso por tipo de presa: pierna, pecho, ala, entrepierna) y las guarniciones elegidas.
- **Alertas de stock mínimo** y **reposición** de insumos.
- **Reportes** de ventas e inventario **exportables a PDF**.
- **Pago por QR estático**.

## 🛠️ Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Vue 3 · Vite · Pinia · Tailwind CSS · vite-plugin-pwa |
| Backend | Node.js · Express · Socket.io |
| ORM / BD | Prisma · MySQL |
| Reportes | jsPDF |

## 🚀 Cómo ejecutarlo

**Requisitos:** Node.js 18+, MySQL.

1. **Base de datos:** crea una base MySQL llamada `gorichicken`.
2. **Backend:**
   ```bash
   cd backend
   cp .env.example .env      # y ajusta DATABASE_URL
   npm install
   npx prisma db push        # crea las tablas
   node prisma/seed.js       # carga datos de ejemplo (4 sucursales, insumos, recetas)
   npm start                 # sirve la API y la app en http://localhost:3000
   ```
3. **Frontend (desarrollo):**
   ```bash
   cd frontend
   npm install
   npm run build             # el backend sirve esta build
   # o para desarrollo con recarga:  npm run dev
   ```
4. Abre **http://localhost:3000/totem** (cliente) o **/login** (personal).

### Usuarios de ejemplo (contraseña: `admin123`)
- 👑 Admin: `admin@gorichicken.com`
- 👔 Gerente: `gerente1@gorichicken.com` (… `gerente4`)
- 💵 Cajero: `caja1@gorichicken.com`
- 🍳 Cocinero: `cocina1@gorichicken.com`
- 📱 Tótem: `totem1@gorichicken.com`

## 📂 Estructura

```
Gori Chicken/
├── backend/     # API Express + Prisma + WebSockets
│   ├── prisma/  # schema.prisma + seed.js
│   └── src/     # controladores, rutas, middlewares, websockets
└── frontend/    # App Vue (Tótem, KDS, POS, Admin, Gerente)
    └── src/     # vistas, almacenes (Pinia), componentes, utilidades
```
