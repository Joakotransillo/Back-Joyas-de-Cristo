const pool = require('../config/db');

const obtenerMiUnidad = async (req, res) => {
  try {
    const [consejeros] = await pool.execute(
      `SELECT consejero.unidad_id, unidad.nombre AS unidad_nombre
       FROM usuarios AS consejero
       LEFT JOIN unidades AS unidad
         ON unidad.id = consejero.unidad_id
       WHERE consejero.id = ?
         AND consejero.rol = 'CONSEJERO'
         AND consejero.estado = 'ACTIVO'
       LIMIT 1`,
      [req.auth.userId]
    );

    if (consejeros.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontró el consejero autenticado' });
    }

    const { unidad_id: unidadId, unidad_nombre: unidadNombre } = consejeros[0];
    if (unidadId === null || unidadId === undefined) {
      return res.status(409).json({ mensaje: 'No tenés una unidad asignada' });
    }

    if (!unidadNombre) {
      return res.status(409).json({ mensaje: 'La unidad asignada no existe' });
    }

    const [miembros] = await pool.execute(
      `SELECT
        conquistador.id,
        conquistador.nombre_completo,
        clase.id AS clase_id,
        clase.nombre AS clase_nombre,
        clase.color_insignia,
        COALESCE(avance.total_requisitos, 0) AS total_requisitos,
        COALESCE(avance.requisitos_completados, 0) AS requisitos_completados
      FROM usuarios AS conquistador
      LEFT JOIN clases AS clase
        ON clase.id = conquistador.clase_actual_id
      LEFT JOIN (
        SELECT
          integrante.id AS usuario_id,
          COUNT(DISTINCT requisito.id) AS total_requisitos,
          COUNT(DISTINCT CASE
            WHEN progreso.id IS NOT NULL THEN requisito.id
          END) AS requisitos_completados
        FROM usuarios AS integrante
        LEFT JOIN cuadernillos AS cuadernillo
          ON cuadernillo.clase_id = integrante.clase_actual_id
        LEFT JOIN categorias_cuadernillo AS categoria
          ON categoria.cuadernillo_id = cuadernillo.id
        LEFT JOIN requisitos AS requisito
          ON requisito.categoria_id = categoria.id
        LEFT JOIN progreso_cuadernillo AS progreso
          ON progreso.requisito_id = requisito.id
         AND progreso.usuario_id = integrante.id
        WHERE integrante.rol = 'CONQUISTADOR'
          AND integrante.estado = 'ACTIVO'
        GROUP BY integrante.id
      ) AS avance
        ON avance.usuario_id = conquistador.id
      WHERE conquistador.unidad_id = ?
        AND conquistador.rol = 'CONQUISTADOR'
        AND conquistador.estado = 'ACTIVO'
      ORDER BY conquistador.nombre_completo ASC, conquistador.id ASC`,
      [unidadId]
    );

    const conquistadores = miembros.map((miembro) => {
      const totalRequisitos = Number(miembro.total_requisitos);
      const requisitosCompletados = Number(miembro.requisitos_completados);

      return {
        id: miembro.id,
        nombre_completo: miembro.nombre_completo,
        clase: miembro.clase_id === null
          ? null
          : {
            id: miembro.clase_id,
            nombre: miembro.clase_nombre,
            color_insignia: miembro.color_insignia
          },
        avance: {
          requisitos_completados: requisitosCompletados,
          total_requisitos: totalRequisitos,
          porcentaje: totalRequisitos === 0
            ? 0
            : Math.round((requisitosCompletados / totalRequisitos) * 100)
        }
      };
    });

    return res.json({
      unidad: { id: unidadId, nombre: unidadNombre },
      conquistadores
    });
  } catch (error) {
    console.error('Error en GET /api/consejero/mi-unidad:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { obtenerMiUnidad };
