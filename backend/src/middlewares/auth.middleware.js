import jwt from 'jsonwebtoken';

// Este middleware actúa como un guardián
export const verificarToken = (req, res, next) => {
  // 1. Buscamos el token en las cabeceras de la petición
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No hay token, autorización denegada' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verificamos que el token sea válido usando nuestra palabra secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gori_secret_key');

    // 3. Extraemos el tenant_id (sucursalId) y el usuarioId y los guardamos en la petición (req)
    req.usuarioId = decoded.id;
    req.sucursalId = decoded.sucursalId; // ESTE ES EL TENANT_ID
    req.rol = decoded.rol;

    // 4. Dejamos que la petición continúe su camino hacia la ruta final
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'El token no es válido o ha expirado' });
  }
};
