const pool = require('../config/db');

const obtenerInicio = async (req, res) => {
  try {
    const [perfiles] = await pool.execute(
      `SELECT
        u.id,
        u.nombre_completo,
        u.email,
        u.rol,
        u.fecha_nacimiento,
        un.id AS unidad_id,
        un.nombre AS unidad_nombre,
        c.id AS clase_id,
        c.nombre AS clase_nombre,
        c.color_insignia,
        COALESCE(avance.total_requisitos, 0) AS total_requisitos,
        COALESCE(avance.requisitos_completados, 0) AS requisitos_completados,
        COALESCE(especialidades.total, 0) AS especialidades_completadas
      FROM usuarios AS u
      LEFT JOIN unidades AS un
        ON un.id = u.unidad_id
      LEFT JOIN clases AS c
        ON c.id = u.clase_actual_id
      LEFT JOIN (
        SELECT
          cuadernillo.clase_id,
          COUNT(DISTINCT requisito.id) AS total_requisitos,
          COUNT(DISTINCT CASE
            WHEN progreso.id IS NOT NULL THEN requisito.id
          END) AS requisitos_completados
        FROM cuadernillos AS cuadernillo
        JOIN categorias_cuadernillo AS categoria
          ON categoria.cuadernillo_id = cuadernillo.id
        JOIN requisitos AS requisito
          ON requisito.categoria_id = categoria.id
        LEFT JOIN progreso_cuadernillo AS progreso
          ON progreso.requisito_id = requisito.id
         AND progreso.usuario_id = ?
        GROUP BY cuadernillo.clase_id
      ) AS avance
        ON avance.clase_id = c.id
      LEFT JOIN (
        SELECT usuario_id, COUNT(*) AS total
        FROM especialidades_usuario
        GROUP BY usuario_id
      ) AS especialidades
        ON especialidades.usuario_id = u.id
      WHERE u.id = ?
        AND u.estado = 'ACTIVO'`,
      [req.auth.userId, req.auth.userId]
    );

    if (perfiles.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontró el usuario autenticado' });
    }

    const perfil = perfiles[0];
    const totalRequisitos = Number(perfil.total_requisitos);
    const requisitosCompletados = Number(perfil.requisitos_completados);
    const porcentaje = totalRequisitos === 0
      ? 0
      : Math.round((requisitosCompletados / totalRequisitos) * 100);

    const [eventos] = await pool.execute(
      `SELECT id, titulo, descripcion, fecha_inicio, fecha_fin, lugar, unidad_id
       FROM eventos
       WHERE estado = 'PUBLICADO'
         AND fecha_inicio >= CURRENT_TIMESTAMP
         AND (unidad_id IS NULL OR unidad_id = ?)
       ORDER BY fecha_inicio ASC
       LIMIT 5`,
      [perfil.unidad_id]
    );

    let anuncios = [];
    if (perfil.unidad_id !== null) {
      const [avisos] = await pool.execute(
        `SELECT
          aviso.id,
          aviso.titulo,
          aviso.contenido,
          aviso.fecha_publicacion,
          consejero.id AS autor_id,
          consejero.nombre_completo AS autor_nombre
        FROM avisos AS aviso
        JOIN usuarios AS consejero
          ON consejero.id = aviso.autor_id
         AND consejero.rol = 'CONSEJERO'
         AND consejero.unidad_id = aviso.unidad_id
         AND consejero.estado = 'ACTIVO'
        WHERE aviso.unidad_id = ?
          AND aviso.fecha_publicacion <= CURRENT_TIMESTAMP
        ORDER BY aviso.fecha_publicacion DESC
        LIMIT 5`,
        [perfil.unidad_id]
      );
      anuncios = avisos;
    }

    return res.json({
      perfil: {
        id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        email: perfil.email,
        rol: perfil.rol,
        fecha_nacimiento: perfil.fecha_nacimiento,
        unidad: perfil.unidad_id === null
          ? null
          : { id: perfil.unidad_id, nombre: perfil.unidad_nombre },
        clase: perfil.clase_id === null
          ? null
          : {
            id: perfil.clase_id,
            nombre: perfil.clase_nombre,
            color_insignia: perfil.color_insignia
          },
        especialidades_completadas: Number(perfil.especialidades_completadas)
      },
      avance_clase: {
        requisitos_completados: requisitosCompletados,
        total_requisitos: totalRequisitos,
        porcentaje
      },
      proximos_eventos: eventos,
      anuncios
    });
  } catch (error) {
    console.error('Error en GET /api/conquis/inicio:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { obtenerInicio };
