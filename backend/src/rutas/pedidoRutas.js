import { Router } from 'express';
import { crearPedido, obtenerPedidosActivos, actualizarEstadoPedido } from '../controladores/pedidoControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = Router();

// Crear un nuevo pedido
rutas.post('/', verificarToken, crearPedido);

// Obtener pedidos activos (PENDIENTE, EN PREPARACION) para el KDS
rutas.get('/', verificarToken, obtenerPedidosActivos);

// Actualizar estado de un pedido (ej: a EN PREPARACION o LISTO)
rutas.put('/:id/estado', verificarToken, actualizarEstadoPedido);

export default rutas;
