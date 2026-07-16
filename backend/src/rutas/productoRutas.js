import express from 'express';
import { listarMenu, disponibilidadMenu } from '../controladores/productoControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = express.Router();

// Menú de la sucursal actual (platos agregados manualmente y disponibles).
// Lo usan el tótem y la caja; se identifica la sucursal por el token.
rutas.get('/menu', verificarToken, listarMenu);

// Disponibilidad por stock: qué platos están agotados según su receta.
rutas.get('/disponibilidad', verificarToken, disponibilidadMenu);

export default rutas;
