const pool = require('../config/db');

const CAMPOS = ['presente', 'puntualidad', 'biblia', 'uniforme', 'cuota'];
const MAX_REGISTROS = 300;

const crearError = (status, mensaje) => Object.assign(new Error(mensaje), { status });

// Fecha válida en formato AAAA-MM-DD que no sea futura.
function fechaValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor + 'T00:00:00Z');
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) return false;
  const manana = new Date();
  manana.setUTCDate(manana.getUTCDate() + 1);
  return fecha <= manana;
}

/**
 * Decide qué unidad puede ver o cargar el usuario:
 * el consejero solo la suya; secretaría y dirección, la que pidan (o la primera).
 */
async function resolverUnidad(conexion, auth, unidadPedida) {
  if (auth.rol === 'CONSEJERO') {
    const [filas] = await conexion.execute(
      `SELECT u.id, u.nombre
       FROM usuarios AS c
       JOIN unidades AS u ON u.id = c.unidad_id
       WHERE c.id = ? AND c.rol = 'CONSEJERO' AND c.estado = 'ACTIVO'`,
      [auth.userId]
    );
    if (filas.length === 0) throw crearError(409, 'No tenés una unidad asignada');
    if (unidadPedida && unidadPedida !== filas[0].id) {
      throw crearError(403, 'Solo podés tomar asistencia de tu unidad');
    }
    return filas[0];
  }

  const [filas] = unidadPedida
    ? await conexion.execute('SELECT id, nombre FROM unidades WHERE id = ?', [unidadPedida])
    : await conexion.execute('SELECT id, nombre FROM unidades ORDER BY nombre LIMIT 1');
  if (filas.length === 0) {
    throw crearError(unidadPedida ? 404 : 409, unidadPedida ? 'La unidad no existe' : 'Todavía no hay unidades cargadas');
  }
  return filas[0];
}

/**
 * GET /api/secretaria/asistencia?fecha=AAAA-MM-DD&unidad_id=N
 * Planilla de una unidad para una fecha, con lo que ya se haya cargado.
 */
const obtenerAsistencia = async (req, res) => {
  const fecha = req.query.fecha;
  if (!fechaValida(fecha)) {
    return res.status(400).json({ mensaje: 'Indicá una fecha válida (AAAA-MM-DD) que no sea futura' });
  }
  const unidadPedida = req.query.unidad_id ? Number(req.query.unidad_id) : null;
  if (unidadPedida !== null && (!Number.isSafeInteger(unidadPedida) || unidadPedida < 1)) {
    return res.status(400).json({ mensaje: 'La unidad no es válida' });
  }

  try {
    const unidad = await resolverUnidad(pool, req.auth, unidadPedida);

    const [filas] = await pool.execute(
      `SELECT
        c.id, c.nombre_completo,
        cl.nombre AS clase_nombre, cl.color_insignia,
        a.presente, a.puntualidad, a.biblia, a.uniforme, a.cuota
      FROM usuarios AS c
      LEFT JOIN clases AS cl ON cl.id = c.clase_actual_id
      LEFT JOIN asistencia AS a ON a.usuario_id = c.id AND a.fecha = ?
      WHERE c.unidad_id = ? AND c.rol = 'CONQUISTADOR' AND c.estado = 'ACTIVO'
      ORDER BY c.nombre_completo, c.id`,
      [fecha, unidad.id]
    );

    let unidades = [unidad];
    if (req.auth.rol !== 'CONSEJERO') {
      [unidades] = await pool.execute('SELECT id, nombre FROM unidades ORDER BY nombre');
    }

    const conquistadores = filas.map((fila) => ({
      id: fila.id,
      nombre_completo: fila.nombre_completo,
      clase: fila.clase_nombre ? { nombre: fila.clase_nombre, color_insignia: fila.color_insignia } : null,
      registro: fila.presente === null
        ? null
        : Object.fromEntries(CAMPOS.map((campo) => [campo, Boolean(fila[campo])]))
    }));

    return res.json({
      fecha,
      unidad,
      unidades,
      guardada: conquistadores.some((item) => item.registro !== null),
      conquistadores
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    console.error('Error en GET /api/secretaria/asistencia:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * POST /api/secretaria/asistencia
 * Body: { fecha, unidad_id?, registros: [{ conquistador_id, presente, puntualidad, biblia, uniforme, cuota }] }
 * Guarda (o corrige) la asistencia de una unidad. Si no estuvo presente, el resto queda en falso.
 */
const guardarAsistencia = async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (!fechaValida(body.fecha)) {
    return res.status(400).json({ mensaje: 'Indicá una fecha válida (AAAA-MM-DD) que no sea futura' });
  }
  if (!Array.isArray(body.registros) || body.registros.length === 0) {
    return res.status(400).json({ mensaje: 'Indicá al menos un registro de asistencia' });
  }
  if (body.registros.length > MAX_REGISTROS) {
    return res.status(400).json({ mensaje: `No se pueden guardar más de ${MAX_REGISTROS} registros a la vez` });
  }

  const vistos = new Set();
  for (const registro of body.registros) {
    if (!registro || typeof registro !== 'object' || !Number.isSafeInteger(registro.conquistador_id) || registro.conquistador_id < 1) {
      return res.status(400).json({ mensaje: 'Cada registro necesita un conquistador_id válido' });
    }
    if (vistos.has(registro.conquistador_id)) {
      return res.status(400).json({ mensaje: 'No repitas conquistadores en la misma planilla' });
    }
    vistos.add(registro.conquistador_id);
    if (CAMPOS.some((campo) => registro[campo] !== undefined && typeof registro[campo] !== 'boolean')) {
      return res.status(400).json({ mensaje: 'Presente, puntualidad, biblia, uniforme y cuota deben ser verdadero o falso' });
    }
  }

  const unidadPedida = body.unidad_id === undefined || body.unidad_id === null ? null : Number(body.unidad_id);
  if (unidadPedida !== null && (!Number.isSafeInteger(unidadPedida) || unidadPedida < 1)) {
    return res.status(400).json({ mensaje: 'La unidad no es válida' });
  }

  let conexion;
  let transaccion = false;
  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();
    transaccion = true;

    const unidad = await resolverUnidad(conexion, req.auth, unidadPedida);
    const ids = [...vistos];
    const [miembros] = await conexion.execute(
      `SELECT id FROM usuarios
       WHERE id IN (${ids.map(() => '?').join(', ')})
         AND unidad_id = ? AND rol = 'CONQUISTADOR' AND estado = 'ACTIVO'`,
      [...ids, unidad.id]
    );
    if (miembros.length !== ids.length) {
      throw crearError(400, 'Uno o más conquistadores no pertenecen a la unidad o no están activos');
    }

    const valores = body.registros.map((registro) => {
      const presente = registro.presente === true;
      return [
        registro.conquistador_id,
        body.fecha,
        presente,
        presente && registro.puntualidad === true,
        presente && registro.biblia === true,
        presente && registro.uniforme === true,
        presente && registro.cuota === true,
        req.auth.userId
      ];
    });

    await conexion.query(
      `INSERT INTO asistencia (usuario_id, fecha, presente, puntualidad, biblia, uniforme, cuota, registrado_por)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         presente = VALUES(presente),
         puntualidad = VALUES(puntualidad),
         biblia = VALUES(biblia),
         uniforme = VALUES(uniforme),
         cuota = VALUES(cuota),
         registrado_por = VALUES(registrado_por)`,
      [valores]
    );

    await conexion.commit();
    transaccion = false;

    return res.json({
      mensaje: 'Asistencia guardada',
      fecha: body.fecha,
      unidad,
      guardados: valores.length,
      presentes: valores.filter((valor) => valor[2]).length
    });
  } catch (error) {
    if (conexion && transaccion) await conexion.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ mensaje: error.message });
    console.error('Error en POST /api/secretaria/asistencia:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    if (conexion) conexion.release();
  }
};

module.exports = { obtenerAsistencia, guardarAsistencia };
