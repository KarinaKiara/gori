import express from 'express';
import {
  obtenerPersonal,
  crearEmpleado,
  editarEmpleado,
  cambiarRolEmpleado,
  eliminarEmpleado,
  reporteLocal,
  reporteDetallePedido,
  reporteInventarioReceta,
  reporteVentasPagos,
  listarProveedoresGerente,
  obtenerHorario,
  actualizarHorario
} from '../controladores/gerenteControlador.js';
import {
  listarInsumos,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  comprarPollos,
  listarProductos,
  cambiarDisponibilidadProducto,
  obtenerReceta,
  guardarReceta,
  alertasStock,
  reporteConsumo,
  solicitarInsumo,
  misSolicitudesPendientes
} from '../controladores/inventarioControlador.js';
import {
  listarPedidosCompraGerente,
  confirmarPedidoCompra
} from '../controladores/compraControlador.js';
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
rutas.put('/personal/:id', soloGerente, editarEmpleado);
rutas.put('/personal/:id/rol', soloGerente, cambiarRolEmpleado);
rutas.delete('/personal/:id', soloGerente, eliminarEmpleado);

// Proveedores (solo lectura para elegir al reponer stock)
rutas.get('/proveedores', soloGerente, listarProveedoresGerente);

// Pedidos de compra de SU sucursal: los ve y confirma el ingreso
rutas.get('/pedidos-compra', soloGerente, listarPedidosCompraGerente);
rutas.put('/pedidos-compra/:id/confirmar', soloGerente, confirmarPedidoCompra);

// Reporte local de sucursal
rutas.get('/reportes/local', soloGerente, reporteLocal);

// Reportes avanzados de SU sucursal
rutas.get('/reportes/ventas-pagos', soloGerente, reporteVentasPagos);
rutas.get('/reportes/inventario', soloGerente, reporteInventarioReceta);
rutas.get('/reportes/pedido/:id', soloGerente, reporteDetallePedido);

// Horario de atención de su propia sucursal
rutas.get('/horario', soloGerente, obtenerHorario);
rutas.put('/horario', soloGerente, actualizarHorario);

// --- Inventario por recetas ---
// Insumos
rutas.get('/insumos', soloGerente, listarInsumos);
rutas.post('/insumos', soloGerente, crearInsumo);
rutas.post('/insumos/comprar-pollos', soloGerente, comprarPollos);
rutas.put('/insumos/:id', soloGerente, actualizarInsumo);
rutas.delete('/insumos/:id', soloGerente, eliminarInsumo);
// Recetas (producto -> insumos)
rutas.get('/productos', soloGerente, listarProductos);
rutas.put('/productos/:id/disponibilidad', soloGerente, cambiarDisponibilidadProducto);
rutas.get('/recetas/:productoId', soloGerente, obtenerReceta);
rutas.put('/recetas/:productoId', soloGerente, guardarReceta);
// Alertas y reportes de inventario
rutas.get('/inventario/alertas', soloGerente, alertasStock);
rutas.get('/reportes/consumo', soloGerente, reporteConsumo);
// Solicitar reposición de un insumo (le llega al admin)
rutas.post('/inventario/solicitar', soloGerente, solicitarInsumo);
rutas.get('/inventario/solicitudes', soloGerente, misSolicitudesPendientes);

export default rutas;
