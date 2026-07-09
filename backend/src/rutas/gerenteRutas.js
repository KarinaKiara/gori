import express from 'express';
import {
  obtenerPersonal,
  crearEmpleado,
  cambiarRolEmpleado,
  eliminarEmpleado,
  reporteLocal
} from '../controladores/gerenteControlador.js';
import {
  listarInsumos,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  listarProductos,
  obtenerReceta,
  guardarReceta,
  alertasStock,
  reporteConsumo
} from '../controladores/inventarioControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = express.Router();

// Todas las rutas de gerente requieren token + rol GERENTE
const soloGerente = (req, res, next) => {
  verificarToken(req, res, () => {
    if (req.rol !== 'GERENTE') {
      return res.status(403).json({ error: 'Acceso restringido a Gerentes' });
    }
    next();
  });
};

// Personal de sucursal
rutas.get('/personal', soloGerente, obtenerPersonal);
rutas.post('/personal', soloGerente, crearEmpleado);
rutas.put('/personal/:id/rol', soloGerente, cambiarRolEmpleado);
rutas.delete('/personal/:id', soloGerente, eliminarEmpleado);

// Reporte local de sucursal
rutas.get('/reportes/local', soloGerente, reporteLocal);

// --- Inventario por recetas ---
// Insumos
rutas.get('/insumos', soloGerente, listarInsumos);
rutas.post('/insumos', soloGerente, crearInsumo);
rutas.put('/insumos/:id', soloGerente, actualizarInsumo);
rutas.delete('/insumos/:id', soloGerente, eliminarInsumo);
// Recetas (producto -> insumos)
rutas.get('/productos', soloGerente, listarProductos);
rutas.get('/recetas/:productoId', soloGerente, obtenerReceta);
rutas.put('/recetas/:productoId', soloGerente, guardarReceta);
// Alertas y reportes de inventario
rutas.get('/inventario/alertas', soloGerente, alertasStock);
rutas.get('/reportes/consumo', soloGerente, reporteConsumo);

export default rutas;
