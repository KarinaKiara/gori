import express from 'express';
import {
  obtenerSucursales,
  crearSucursal,
  editarSucursal,
  eliminarSucursal,
  obtenerGerentes,
  crearGerente,
  eliminarGerente,
  reporteGlobal
} from '../controladores/adminControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = express.Router();

// Todas las rutas de admin requieren token + rol ADMIN
const soloAdmin = (req, res, next) => {
  verificarToken(req, res, () => {
    if (req.rol !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso restringido a Administradores' });
    }
    next();
  });
};

// Sucursales
rutas.get('/sucursales', soloAdmin, obtenerSucursales);
rutas.post('/sucursales', soloAdmin, crearSucursal);
rutas.put('/sucursales/:id', soloAdmin, editarSucursal);
rutas.delete('/sucursales/:id', soloAdmin, eliminarSucursal);

// Gerentes
rutas.get('/gerentes', soloAdmin, obtenerGerentes);
rutas.post('/gerentes', soloAdmin, crearGerente);
rutas.delete('/gerentes/:id', soloAdmin, eliminarGerente);

// Reportes Globales
rutas.get('/reportes/global', soloAdmin, reporteGlobal);

export default rutas;
