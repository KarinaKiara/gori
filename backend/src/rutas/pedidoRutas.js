import { Router } from 'express';
import { crearPedido, obtenerPedidosActivos, actualizarEstadoPedido, obtenerPedidosPorCobrar, cobrarPedido } from '../controladores/pedidoControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = Router();

// Crear un nuevo pedido
rutas.post('/', verificarToken, crearPedido);

// Obtener pedidos activos (PENDIENTE, EN PREPARACION) para el KDS
rutas.get('/', verificarToken, obtenerPedidosActivos);

// Pedidos del tótem que esperan cobro en caja
rutas.get('/por-cobrar', verificarToken, obtenerPedidosPorCobrar);

// La caja cobra un pedido del tótem (pasa a cocina y descuenta inventario)
rutas.put('/:id/cobrar', verificarToken, cobrarPedido);

// Actualizar estado de un pedido (ej: a EN PREPARACION o LISTO)
rutas.put('/:id/estado', verificarToken, actualizarEstadoPedido);

export default rutas;
