import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET || 'gori_secret_key');
    req.usuario = decodificado;
    req.sucursalId = decodificado.sucursalId;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

