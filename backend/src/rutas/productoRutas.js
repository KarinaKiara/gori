import express from 'express';
import { listarMenu } from '../controladores/productoControlador.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const rutas = express.Router();

// Menú de la sucursal actual (platos agregados manualmente y disponibles).
// Lo usan el tótem y la caja; se identifica la sucursal por el token.
rutas.get('/menu', verificarToken, listarMenu);

export default rutas;
