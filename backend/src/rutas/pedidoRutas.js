import { Router } from 'express';
import { crearPedido, obtenerPedidosActivos, actualizarEstadoPedido, obtenerPedidosPorCobrar, cobrarPedido, buscarPedidoPorRef, estadoPedidoPorRef } from '../controladores/pedidoControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = Router();

// Crear un nuevo pedido
rutas.post('/', verificarToken, crearPedido);

// Obtener pedidos activos (PENDIENTE, EN PREPARACION) para el KDS
rutas.get('/', verificarToken, obtenerPedidosActivos);

// Pedidos del tótem que esperan cobro en caja
rutas.get('/por-cobrar', verificarToken, obtenerPedidosPorCobrar);

// Buscar un pedido por su código (clienteRef del QR) para cargarlo en la caja
rutas.get('/buscar/:clienteRef', verificarToken, buscarPedidoPorRef);

// Estado de un pedido por su código: lo usa el CLIENTE para seguir su pedido en vivo
rutas.get('/estado/:clienteRef', verificarToken, estadoPedidoPorRef);

// La caja cobra un pedido del tótem (pasa a cocina y descuenta inventario)
rutas.put('/:id/cobrar', verificarToken, cobrarPedido);

// Actualizar estado de un pedido (ej: a EN PREPARACION o LISTO)
rutas.put('/:id/estado', verificarToken, actualizarEstadoPedido);

export default rutas;
