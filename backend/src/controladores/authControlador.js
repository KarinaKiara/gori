import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { correo },
      include: { sucursal: true }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        sucursalId: usuario.sucursalId,
        rol: usuario.rol
      },
      process.env.JWT_SECRET || 'gori_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        sucursalId: usuario.sucursalId,
        sucursal: usuario.sucursal ? usuario.sucursal.nombre : 'Global',
        // El tótem y la caja guardan este horario para validar aunque se caiga internet
        horario: usuario.sucursal?.horario || null
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── Canal del cliente: sesión de tótem para la sucursal elegida ──
//
// Cuando alguien entra a /pedir y elige su local, necesita una sesión para ver el
// menú y pedir. Antes el frontend iniciaba sesión con la contraseña del tótem
// ESCRITA EN EL CÓDIGO: cualquiera podía leerla en el navegador, y como el sistema
// se instala con una contraseña compartida, esa misma abría la cuenta del admin.
//
// Ahora la entrega el servidor: solo para el usuario TOTEM de esa sucursal, y sin
// contraseña de por medio. Es el mismo permiso que ya tenía el cliente (ver el menú
// y crear pedidos), pero sin publicar una credencial.
export const sesionCanalCliente = async (req, res) => {
  try {
    const { sucursalId } = req.body;
    if (!sucursalId) return res.status(400).json({ error: 'Falta la sucursal' });

    const totem = await prisma.usuario.findFirst({
      where: { sucursalId, rol: 'TOTEM' },
      include: { sucursal: true }
    });
    if (!totem) return res.status(404).json({ error: 'Este local aún no está disponible para pedidos' });

    const token = jwt.sign(
      { id: totem.id, sucursalId: totem.sucursalId, rol: 'TOTEM' },
      process.env.JWT_SECRET || 'gori_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: totem.id,
        nombre: totem.nombre,
        rol: 'TOTEM',
        sucursalId: totem.sucursalId,
        sucursal: totem.sucursal?.nombre || '',
        horario: totem.sucursal?.horario || null
      }
    });
  } catch (error) {
    console.error('Error al abrir el canal del cliente:', error);
    res.status(500).json({ error: 'Error al abrir el canal del cliente' });
  }
};

export const obtenerSucursales = async (req, res) => {
  try {
    const sucursales = await prisma.sucursal.findMany({
      include: {
        // Incluimos al usuario totem asociado para poder hacer el auto-login en el frontend
        usuarios: {
          where: { rol: 'TOTEM' },
          select: { correo: true }
        }
      }
    });
    res.json(sucursales);
  } catch (error) {
    console.error('Error al obtener sucursales:', error);
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
};
