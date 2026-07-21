import express from 'express';
import { login, obtenerSucursales, sesionCanalCliente } from '../controladores/authControlador.js';

const rutas = express.Router();

rutas.post('/login', login);
rutas.get('/sucursales', obtenerSucursales);
// El cliente elige su local en /pedir y el servidor le abre la sesión del tótem
rutas.post('/canal-cliente', sesionCanalCliente);

export default rutas;
