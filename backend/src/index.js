import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { inicializarWebSockets } from './websockets/index.js';
import authRutas from './rutas/authRutas.js';
import pedidoRutas from './rutas/pedidoRutas.js';
import adminRutas from './rutas/adminRutas.js';
import gerenteRutas from './rutas/gerenteRutas.js';
import productoRutas from './rutas/productoRutas.js';
import { PrismaClient } from '@prisma/client';
import { sembrarHorarios } from './utilidades/sembrarHorarios.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();


const app = express();
const httpServer = createServer(app);

// Middlewares globales
app.use(cors());
app.use(express.json());


// Inicializar WebSockets para el KDS
const io = inicializarWebSockets(httpServer);
app.set('io', io); // Guardar io para poder usarlo en los controladores

// Rutas básicas
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'OK', mensaje: 'El backend de Gori Chicken está funcionando' });
});

// Rutas de API
app.use('/api/auth', authRutas);
app.use('/api/pedidos', pedidoRutas);
app.use('/api/admin', adminRutas);
app.use('/api/gerente', gerenteRutas);
app.use('/api/productos', productoRutas);

// Servir la app compilada (frontend/dist) desde el mismo servidor.
// Así la app y la API viven en el mismo origen: las rutas /api y los WebSockets
// funcionan igual en localhost, en la red WiFi o por un túnel, sin proxy.
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

// Cualquier otra ruta (que no sea /api) devuelve la app para el enrutado del cliente (SPA)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Arrancar servidor
const PUERTO = process.env.PORT || 3000;
httpServer.listen(PUERTO, () => {
  console.log(`El servidor está corriendo en el puerto ${PUERTO}`);
  console.log(`App disponible en: http://localhost:${PUERTO}/totem`);
  // Completa el horario de las sucursales que aún no lo tengan (no bloquea el arranque)
  sembrarHorarios(new PrismaClient());
});
