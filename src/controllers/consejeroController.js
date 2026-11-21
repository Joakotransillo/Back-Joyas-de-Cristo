const pool = require('../config/db');

const MAX_EVALUACIONES = 200;
const MAX_REQUISITOS_POR_EVALUACION = 100;
const MAX_FIRMAS_POR_SOLICITUD = 5000;

const crearErrorSolicitud = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const validarEvaluaciones = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON' };
  }

  if (Object.keys(body).some((campo) => campo !== 'evaluaciones')) {
    return { error: 'El único campo permitido es evaluaciones' };
  }

  if (!Array.isArray(body.evaluaciones) || body.evaluaciones.length === 0) {
    return { error: 'Indicá al menos una evaluación' };
  }

  if (body.evaluaciones.length > MAX_EVALUACIONES) {
    return { error: `No se pueden evaluar más de ${MAX_EVALUACIONES} conquistadores por solicitud` };
  }

  const conquistadoresVistos = new Set();
  let totalFirmas = 0;

  for (const evaluacion of body.evaluaciones) {
    if (!evaluacion || typeof evaluacion !== 'object' || Array.isArray(evaluacion)) {
      return { error: 'Cada evaluación debe ser un objeto' };
    }

    if (Object.keys(evaluacion).some((campo) => !['conquistador_id', 'requisitos_ids'].includes(campo))) {
      return { error: 'Cada evaluación solo puede incluir conquistador_id y requisitos_ids' };
    }

    const { conquistador_id: conquistadorId, requisitos_ids: requisitosIds } = evaluacion;
    if (!Number.isSafeInteger(conquistadorId) || conquistadorId < 1) {
      return { error: 'Cada conquistador_id debe ser un entero positivo' };
    }

    if (conquistadoresVistos.has(conquistadorId)) {
      return { error: 'No repitas conquistadores; agrupá sus requisitos en una sola evaluación' };
    }
    conquistadoresVistos.add(conquistadorId);

    if (!Array.isArray(requisitosIds) || requisitosIds.length === 0) {
      return { error: 'Cada evaluación debe incluir al menos un requisito_id en requisitos_ids' };
    }

    if (requisitosIds.length > MAX_REQUISITOS_POR_EVALUACION) {
      return { error: `No se pueden evaluar más de ${MAX_REQUISITOS_POR_EVALUACION} requisitos por conquistador` };
    }

    const requisitosVistos = new Set();
    for (const requisitoId of requisitosIds) {
      if (!Number.isSafeInteger(requisitoId) || requisitoId < 1) {
        return { error: 'Cada requisito_id debe ser un entero positivo' };
      }

      if (requisitosVistos.has(requisitoId)) {
        return { error: 'No repitas requisitos dentro de una evaluación' };
      }
      requisitosVistos.add(requisitoId);
    }

    totalFirmas += requisitosIds.length;
    if (totalFirmas > MAX_FIRMAS_POR_SOLICITUD) {
      return { error: `No se pueden registrar más de ${MAX_FIRMAS_POR_SOLICITUD} firmas por solicitud` };
    }
  }

  return { evaluaciones: body.evaluaciones, totalFirmas };
};

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

const evaluarRequisitos = async (req, res) => {
  const resultadoValidacion = validarEvaluaciones(req.body);
  if (resultadoValidacion.error) {
    return res.status(400).json({ mensaje: resultadoValidacion.error });
  }

  const { evaluaciones, totalFirmas } = resultadoValidacion;
  const conquistadoresIds = evaluaciones.map(({ conquistador_id: id }) => id);
  const requisitosIds = [...new Set(
    evaluaciones.flatMap(({ requisitos_ids: ids }) => ids)
  )];

  let connection;
  let transaccionIniciada = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccionIniciada = true;

    const [consejeros] = await connection.execute(
      `SELECT unidad_id
       FROM usuarios
       WHERE id = ?
         AND rol = 'CONSEJERO'
         AND estado = 'ACTIVO'
       FOR UPDATE`,
      [req.auth.userId]
    );

    if (consejeros.length === 0) {
      throw crearErrorSolicitud(404, 'No se encontró el consejero autenticado');
    }

    const unidadId = consejeros[0].unidad_id;
    if (unidadId === null || unidadId === undefined) {
      throw crearErrorSolicitud(409, 'No tenés una unidad asignada');
    }

    const placeholdersConquistadores = conquistadoresIds.map(() => '?').join(', ');
    const [conquistadores] = await connection.execute(
      `SELECT id, clase_actual_id
       FROM usuarios
       WHERE id IN (${placeholdersConquistadores})
         AND unidad_id = ?
         AND rol = 'CONQUISTADOR'
         AND estado = 'ACTIVO'
       FOR UPDATE`,
      [...conquistadoresIds, unidadId]
    );

    if (conquistadores.length !== conquistadoresIds.length) {
      throw crearErrorSolicitud(
        404,
        'Uno o más conquistadores no pertenecen a tu unidad o no están activos'
      );
    }

    const conquistadoresPorId = new Map(
      conquistadores.map((conquistador) => [conquistador.id, conquistador])
    );

    if (conquistadores.some((conquistador) => conquistador.clase_actual_id === null)) {
      throw crearErrorSolicitud(409, 'Todos los conquistadores deben tener una clase asignada');
    }

    const placeholdersRequisitos = requisitosIds.map(() => '?').join(', ');
    const [requisitos] = await connection.execute(
      `SELECT requisito.id, cuadernillo.clase_id
       FROM requisitos AS requisito
       JOIN categorias_cuadernillo AS categoria
         ON categoria.id = requisito.categoria_id
       JOIN cuadernillos AS cuadernillo
         ON cuadernillo.id = categoria.cuadernillo_id
       WHERE requisito.id IN (${placeholdersRequisitos})`,
      requisitosIds
    );

    if (requisitos.length !== requisitosIds.length) {
      throw crearErrorSolicitud(400, 'Uno o más requisitos indicados no existen');
    }

    const clasePorRequisito = new Map(
      requisitos.map((requisito) => [requisito.id, requisito.clase_id])
    );

    for (const evaluacion of evaluaciones) {
      const conquistador = conquistadoresPorId.get(evaluacion.conquistador_id);
      const requisitoAjeno = evaluacion.requisitos_ids.some(
        (requisitoId) => clasePorRequisito.get(requisitoId) !== conquistador.clase_actual_id
      );

      if (requisitoAjeno) {
        throw crearErrorSolicitud(
          400,
          `Uno o más requisitos no pertenecen a la clase del conquistador ${evaluacion.conquistador_id}`
        );
      }
    }

    const valores = evaluaciones.flatMap((evaluacion) => (
      evaluacion.requisitos_ids.map((requisitoId) => [
        evaluacion.conquistador_id,
        requisitoId,
        req.auth.userId
      ])
    ));
    const placeholdersValores = valores.map(() => '(?, ?, ?)').join(', ');
    const parametros = valores.flat();

    const [resultado] = await connection.execute(
      `INSERT INTO progreso_cuadernillo (usuario_id, requisito_id, evaluador_id)
       VALUES ${placeholdersValores}
       ON DUPLICATE KEY UPDATE id = id`,
      parametros
    );

    await connection.commit();
    transaccionIniciada = false;

    const firmasNuevas = Math.min(resultado.affectedRows, totalFirmas);
    return res.json({
      mensaje: 'Evaluación registrada correctamente',
      conquistadores_evaluados: evaluaciones.length,
      firmas_creadas: firmasNuevas,
      ya_firmados: totalFirmas - firmasNuevas
    });
  } catch (error) {
    if (connection && transaccionIniciada) {
      await connection.rollback().catch(() => {});
    }

    if (error.status) {
      return res.status(error.status).json({ mensaje: error.message });
    }

    console.error('Error en POST /api/consejero/evaluar:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = { obtenerMiUnidad, evaluarRequisitos };
