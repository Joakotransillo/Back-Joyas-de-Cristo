const pool = require('../config/db');

// Roles que pueden ver el desarrollo de las preguntas (material de evaluación).
const ROLES_CON_DESARROLLO = new Set(['CONSEJERO', 'DIRECTOR']);

/**
 * GET /api/especialidades
 * Catálogo completo con el estado del usuario autenticado (completada o no).
 */
const listarEspecialidades = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT
        e.id,
        e.nombre,
        e.codigo,
        e.categoria,
        e.insignia_url,
        COUNT(DISTINCT p.id) AS total_preguntas,
        eu.fecha_completado
      FROM especialidades AS e
      LEFT JOIN preguntas_especialidad AS p
        ON p.especialidad_id = e.id
      LEFT JOIN especialidades_usuario AS eu
        ON eu.especialidad_id = e.id
       AND eu.usuario_id = ?
      GROUP BY e.id, e.nombre, e.codigo, e.categoria, e.insignia_url, eu.fecha_completado
      ORDER BY e.categoria, e.nombre`,
      [req.auth.userId]
    );

    return res.json({
      especialidades: filas.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        codigo: fila.codigo,
        categoria: fila.categoria,
        insignia_url: fila.insignia_url,
        total_preguntas: Number(fila.total_preguntas),
        completada: fila.fecha_completado !== null,
        fecha_completado: fila.fecha_completado
      }))
    });
  } catch (error) {
    console.error('Error en GET /api/especialidades:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * GET /api/especialidades/:id
 * Detalle con sus preguntas. El desarrollo solo se incluye para consejeros y dirección.
 */
const obtenerEspecialidad = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ mensaje: 'El identificador de la especialidad no es válido' });
  }

  const veDesarrollo = ROLES_CON_DESARROLLO.has(req.auth.rol);

  try {
    const [especialidades] = await pool.execute(
      `SELECT e.id, e.nombre, e.codigo, e.categoria, e.insignia_url, eu.fecha_completado
       FROM especialidades AS e
       LEFT JOIN especialidades_usuario AS eu
         ON eu.especialidad_id = e.id
        AND eu.usuario_id = ?
       WHERE e.id = ?`,
      [req.auth.userId, id]
    );

    if (especialidades.length === 0) {
      return res.status(404).json({ mensaje: 'No encontramos esa especialidad' });
    }

    const [preguntas] = await pool.execute(
      `SELECT id, numero, pregunta, desarrollo
       FROM preguntas_especialidad
       WHERE especialidad_id = ?
       ORDER BY numero`,
      [id]
    );

    const especialidad = especialidades[0];
    const respuesta = {
      id: especialidad.id,
      nombre: especialidad.nombre,
      codigo: especialidad.codigo,
      categoria: especialidad.categoria,
      insignia_url: especialidad.insignia_url,
      completada: especialidad.fecha_completado !== null,
      fecha_completado: especialidad.fecha_completado,
      preguntas: preguntas.map((pregunta) => {
        const item = { id: pregunta.id, numero: pregunta.numero, pregunta: pregunta.pregunta };
        if (veDesarrollo) item.desarrollo = pregunta.desarrollo;
        return item;
      })
    };

    if (veDesarrollo) {
      respuesta.desarrollada = preguntas.some((pregunta) => Boolean(pregunta.desarrollo && pregunta.desarrollo.trim()));
    }

    return res.json(respuesta);
  } catch (error) {
    console.error('Error en GET /api/especialidades/:id:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { listarEspecialidades, obtenerEspecialidad };
