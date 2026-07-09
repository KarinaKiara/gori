import express from 'express';
import { login, obtenerSucursales } from '../controladores/authControlador.js';

const rutas = express.Router();

rutas.post('/login', login);
rutas.get('/sucursales', obtenerSucursales);

export default rutas;
