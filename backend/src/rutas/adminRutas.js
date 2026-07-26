import express from 'express';
import {
  obtenerSucursales,
  crearSucursal,
  editarSucursal,
  eliminarSucursal,
  obtenerGerentes,
  crearGerente,
  eliminarGerente,
  reporteGlobal,
  reporteDetallePedidoAdmin,
  reporteInventarioAdmin,
  reporteVentasPagosAdmin,
  listarProveedores,
  crearProveedor,
  editarProveedor,
  eliminarProveedor,
  listarInsumosCatalogo
} from '../controladores/adminControlador.js';
import {
  crearProducto,
  listarProductosManual,
  actualizarProducto,
  eliminarProducto
} from '../controladores/productoControlador.js';
import {
  crearPedidoCompra,
  listarPedidosCompraAdmin,
  cancelarPedidoCompra
} from '../controladores/compraControlador.js';
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

// Gestión de platos del menú (agregados manualmente)
rutas.get('/productos', soloAdmin, listarProductosManual);
rutas.post('/productos', soloAdmin, crearProducto);
rutas.put('/productos/:id', soloAdmin, actualizarProducto);
rutas.delete('/productos/:id', soloAdmin, eliminarProducto);

// Proveedores (catálogo maestro)
rutas.get('/insumos-catalogo', soloAdmin, listarInsumosCatalogo);
rutas.get('/proveedores', soloAdmin, listarProveedores);
rutas.post('/proveedores', soloAdmin, crearProveedor);
rutas.put('/proveedores/:id', soloAdmin, editarProveedor);
rutas.delete('/proveedores/:id', soloAdmin, eliminarProveedor);

// Pedidos de compra (el admin los crea y los cancela; el gerente los recibe)
rutas.get('/pedidos-compra', soloAdmin, listarPedidosCompraAdmin);
rutas.post('/pedidos-compra', soloAdmin, crearPedidoCompra);
rutas.put('/pedidos-compra/:id/cancelar', soloAdmin, cancelarPedidoCompra);

// Reportes Globales
rutas.get('/reportes/global', soloAdmin, reporteGlobal);

// Reportes avanzados (todas las sucursales)
rutas.get('/reportes/ventas-pagos', soloAdmin, reporteVentasPagosAdmin);
rutas.get('/reportes/inventario', soloAdmin, reporteInventarioAdmin);
rutas.get('/reportes/pedido/:id', soloAdmin, reporteDetallePedidoAdmin);

export default rutas;
