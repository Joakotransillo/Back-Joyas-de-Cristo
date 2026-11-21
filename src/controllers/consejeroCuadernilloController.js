const pool = require('../config/db');
const { construirCuadernillo } = require('./cuadernilloController');

/**
 * GET /api/consejero/conquistadores/:id/cuadernillo
 * El consejero ve el cuadernillo de un conquistador de su unidad para saber qué firmar.
 */
const obtenerCuadernilloDeConquistador = async (req, res) => {
  const conquistadorId = Number(req.params.id);
  if (!Number.isSafeInteger(conquistadorId) || conquistadorId < 1) {
    return res.status(400).json({ mensaje: 'El identificador del conquistador no es válido' });
  }

  try {
    const [filas] = await pool.execute(
      `SELECT conquistador.id, conquistador.nombre_completo
       FROM usuarios AS consejero
       JOIN usuarios AS conquistador
         ON conquistador.unidad_id = consejero.unidad_id
        AND conquistador.rol = 'CONQUISTADOR'
        AND conquistador.estado = 'ACTIVO'
       WHERE consejero.id = ?
         AND consejero.rol = 'CONSEJERO'
         AND consejero.estado = 'ACTIVO'
         AND consejero.unidad_id IS NOT NULL
         AND conquistador.id = ?
       LIMIT 1`,
      [req.auth.userId, conquistadorId]
    );

    if (filas.length === 0) {
      return res.status(404).json({ mensaje: 'Ese conquistador no pertenece a tu unidad o no está activo' });
    }

    const { status, cuerpo } = await construirCuadernillo(conquistadorId);
    if (status !== 200) {
      return res.status(status).json(cuerpo);
    }

    return res.json({
      conquistador: { id: filas[0].id, nombre_completo: filas[0].nombre_completo },
      ...cuerpo
    });
  } catch (error) {
    console.error('Error en GET /api/consejero/conquistadores/:id/cuadernillo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { obtenerCuadernilloDeConquistador };
