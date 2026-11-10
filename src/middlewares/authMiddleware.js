const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const requireAuth = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ mensaje: 'Falta un token de autenticación válido' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    console.error('JWT_SECRET no está configurado o tiene menos de 32 bytes');
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }

  let claims;
  try {
    claims = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o vencido' });
  }

  if (!Number.isSafeInteger(claims.id) || typeof claims.jti !== 'string') {
    return res.status(401).json({ mensaje: 'Token inválido o vencido' });
  }

  try {
    const [sessions] = await pool.execute(
      `SELECT 1
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.jti = ?
         AND s.usuario_id = ?
         AND s.revocada_en IS NULL
         AND s.expira_en > UTC_TIMESTAMP(3)
         AND u.estado = 'ACTIVO'`,
      [claims.jti, claims.id]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ mensaje: 'La sesión ya no está activa' });
    }

    req.auth = {
      userId: claims.id,
      jti: claims.jti
    };

    return next();
  } catch (error) {
    console.error('Error al validar la sesión:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = requireAuth;
