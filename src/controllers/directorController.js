const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword } = require('../utils/passwordHelper');

// Letras y números fáciles de dictar o copiar: sin 0/O, 1/l/I.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Contraseña temporal legible, por ejemplo "Joyas-k7Qm-p4Xz". */
const generarContrasenaTemporal = () => {
  const bloque = () => Array.from(crypto.randomBytes(4), (byte) => ALFABETO[byte % ALFABETO.length]).join('');
  return `Joyas-${bloque()}-${bloque()}`;
};

const crearError = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const parsearIdOpcional = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : NaN;
};

/**
 * GET /api/director/solicitudes
 * Solicitudes de registro pendientes, de la más vieja a la más nueva.
 */
const listarSolicitudes = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT
        s.id,
        s.nombre_completo,
        s.email,
        s.fecha_nacimiento,
        s.fecha_solicitud,
        c.id AS clase_id,
        c.nombre AS clase_nombre,
        c.color_insignia,
        u.id AS unidad_id,
        u.nombre AS unidad_nombre
      FROM solicitudes_registro AS s
      LEFT JOIN clases AS c ON c.id = s.clase_sugerida_id
      LEFT JOIN unidades AS u ON u.id = s.unidad_sugerida_id
      WHERE s.estado = 'PENDIENTE'
      ORDER BY s.fecha_solicitud ASC, s.id ASC`
    );

    return res.json({
      solicitudes: filas.map((fila) => ({
        id: fila.id,
        nombre_completo: fila.nombre_completo,
        email: fila.email,
        fecha_nacimiento: fila.fecha_nacimiento,
        fecha_solicitud: fila.fecha_solicitud,
        clase_sugerida: fila.clase_id === null
          ? null
          : { id: fila.clase_id, nombre: fila.clase_nombre, color_insignia: fila.color_insignia },
        unidad_sugerida: fila.unidad_id === null
          ? null
          : { id: fila.unidad_id, nombre: fila.unidad_nombre }
      }))
    });
  } catch (error) {
    console.error('Error en GET /api/director/solicitudes:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * GET /api/director/catalogo
 * Clases y unidades para elegir al aprobar una solicitud.
 */
const obtenerCatalogo = async (req, res) => {
  try {
    const [clases] = await pool.execute('SELECT id, nombre, color_insignia FROM clases ORDER BY id');
    const [unidades] = await pool.execute('SELECT id, nombre FROM unidades ORDER BY nombre');
    return res.json({ clases, unidades });
  } catch (error) {
    console.error('Error en GET /api/director/catalogo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * PATCH /api/director/solicitudes/:id/responder
 * Body: { decision: 'APROBAR' | 'RECHAZAR', clase_id?, unidad_id? }
 * - APROBAR crea al conquistador con una contraseña temporal, que se devuelve una sola vez.
 * - RECHAZAR borra la solicitud, así la persona puede volver a pedir cuenta con el mismo correo.
 */
const responderSolicitud = async (req, res) => {
  const solicitudId = Number(req.params.id);
  if (!Number.isSafeInteger(solicitudId) || solicitudId < 1) {
    return res.status(400).json({ mensaje: 'El identificador de la solicitud no es válido' });
  }

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const decision = typeof body.decision === 'string' ? body.decision.toUpperCase() : '';
  if (!['APROBAR', 'RECHAZAR'].includes(decision)) {
    return res.status(400).json({ mensaje: 'La decisión debe ser APROBAR o RECHAZAR' });
  }

  const claseId = parsearIdOpcional(body.clase_id);
  const unidadId = parsearIdOpcional(body.unidad_id);
  if (Number.isNaN(claseId) || Number.isNaN(unidadId)) {
    return res.status(400).json({ mensaje: 'La clase y la unidad deben ser identificadores válidos' });
  }

  let connection;
  let transaccion = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transaccion = true;

    const [solicitudes] = await connection.execute(
      `SELECT id, nombre_completo, email, fecha_nacimiento, clase_sugerida_id, unidad_sugerida_id
       FROM solicitudes_registro
       WHERE id = ? AND estado = 'PENDIENTE'
       FOR UPDATE`,
      [solicitudId]
    );
    if (solicitudes.length === 0) {
      throw crearError(404, 'La solicitud no existe o ya fue respondida');
    }
    const solicitud = solicitudes[0];

    if (decision === 'RECHAZAR') {
      await connection.execute('DELETE FROM solicitudes_registro WHERE id = ?', [solicitudId]);
      await connection.commit();
      transaccion = false;
      return res.json({ mensaje: 'Solicitud rechazada', solicitud_id: solicitudId });
    }

    const claseFinal = claseId ?? solicitud.clase_sugerida_id;
    const unidadFinal = body.unidad_id === undefined ? solicitud.unidad_sugerida_id : unidadId;
    if (claseFinal === null || claseFinal === undefined) {
      throw crearError(400, 'Elegí la clase del conquistador para aprobar la solicitud');
    }

    const [clases] = await connection.execute('SELECT id FROM clases WHERE id = ?', [claseFinal]);
    if (clases.length === 0) throw crearError(400, 'La clase elegida no existe');
    if (unidadFinal !== null && unidadFinal !== undefined) {
      const [unidades] = await connection.execute('SELECT id FROM unidades WHERE id = ?', [unidadFinal]);
      if (unidades.length === 0) throw crearError(400, 'La unidad elegida no existe');
    }

    const [existentes] = await connection.execute(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [solicitud.email]
    );
    if (existentes.length > 0) {
      throw crearError(409, 'Ya existe una cuenta con ese correo');
    }

    const contrasenaTemporal = generarContrasenaTemporal();
    const [nuevo] = await connection.execute(
      `INSERT INTO usuarios
        (nombre_completo, email, password_hash, fecha_nacimiento, rol, unidad_id, clase_actual_id, estado)
       VALUES (?, ?, ?, ?, 'CONQUISTADOR', ?, ?, 'ACTIVO')`,
      [
        solicitud.nombre_completo,
        solicitud.email,
        await hashPassword(contrasenaTemporal),
        solicitud.fecha_nacimiento,
        unidadFinal ?? null,
        claseFinal
      ]
    );

    await connection.execute(
      "UPDATE solicitudes_registro SET estado = 'APROBADA' WHERE id = ?",
      [solicitudId]
    );

    await connection.commit();
    transaccion = false;

    return res.json({
      mensaje: 'Solicitud aprobada',
      usuario: {
        id: nuevo.insertId,
        nombre_completo: solicitud.nombre_completo,
        email: solicitud.email,
        clase_id: claseFinal,
        unidad_id: unidadFinal ?? null
      },
      contrasena_temporal: contrasenaTemporal
    });
  } catch (error) {
    if (connection && transaccion) {
      await connection.rollback().catch(() => {});
    }
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.message });
    }
    console.error('Error en PATCH /api/director/solicitudes/:id/responder:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    if (connection) connection.release();
  }
};

const promedio = (valores) => (valores.length
  ? Math.round(valores.reduce((suma, valor) => suma + valor, 0) / valores.length)
  : 0);

/**
 * GET /api/director/metricas
 * Resumen del club en tiempo real: totales, avance por unidad y por clase,
 * y asistencia de los últimos sábados cargados.
 */
const obtenerMetricas = async (req, res) => {
  try {
    // Avance de cada conquistador activo sobre los requisitos de su clase (regular y avanzada).
    const [conquistadores] = await pool.execute(
      `SELECT
        c.id, c.unidad_id, c.clase_actual_id,
        COUNT(DISTINCT r.id) AS total,
        COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN r.id END) AS firmados
      FROM usuarios AS c
      LEFT JOIN cuadernillos AS b ON b.clase_id = c.clase_actual_id
      LEFT JOIN categorias_cuadernillo AS cat ON cat.cuadernillo_id = b.id
      LEFT JOIN requisitos AS r ON r.categoria_id = cat.id
      LEFT JOIN progreso_cuadernillo AS p ON p.requisito_id = r.id AND p.usuario_id = c.id
      WHERE c.rol = 'CONQUISTADOR' AND c.estado = 'ACTIVO'
      GROUP BY c.id, c.unidad_id, c.clase_actual_id`
    );
    const avances = conquistadores.map((fila) => ({
      unidadId: fila.unidad_id,
      claseId: fila.clase_actual_id,
      tieneRequisitos: Number(fila.total) > 0,
      porcentaje: Number(fila.total) > 0 ? Math.round((Number(fila.firmados) / Number(fila.total)) * 100) : 0
    }));

    const [unidades] = await pool.execute(
      `SELECT u.id, u.nombre,
        (SELECT GROUP_CONCAT(k.nombre_completo ORDER BY k.nombre_completo SEPARATOR ', ')
         FROM usuarios AS k
         WHERE k.unidad_id = u.id AND k.rol = 'CONSEJERO' AND k.estado = 'ACTIVO') AS consejeros
      FROM unidades AS u
      ORDER BY u.nombre`
    );
    const [clases] = await pool.execute(
      `SELECT cl.id, cl.nombre, cl.color_insignia,
        (SELECT COUNT(*) FROM cuadernillos AS b
         JOIN categorias_cuadernillo AS cat ON cat.cuadernillo_id = b.id
         JOIN requisitos AS r ON r.categoria_id = cat.id
         WHERE b.clase_id = cl.id) AS requisitos_cargados
      FROM clases AS cl
      ORDER BY cl.id`
    );

    const resumirGrupo = (lista) => {
      const conRequisitos = lista.filter((item) => item.tieneRequisitos);
      return {
        conquistadores: lista.length,
        avance_promedio: promedio(conRequisitos.map((item) => item.porcentaje)),
        con_requisitos: conRequisitos.length
      };
    };

    const [[contadores]] = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'CONSEJERO' AND estado = 'ACTIVO') AS consejeros,
        (SELECT COUNT(*) FROM solicitudes_registro WHERE estado = 'PENDIENTE') AS solicitudes_pendientes,
        (SELECT COUNT(*) FROM especialidades_usuario AS eu
         JOIN usuarios AS u ON u.id = eu.usuario_id AND u.estado = 'ACTIVO') AS especialidades_completadas,
        (SELECT COUNT(*) FROM progreso_cuadernillo) AS requisitos_firmados`
    );

    // Últimos 8 días con asistencia cargada, del más viejo al más nuevo.
    const [asistencia] = await pool.execute(
      `SELECT * FROM (
        SELECT DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
          COUNT(*) AS registrados,
          SUM(a.presente) AS presentes,
          SUM(a.puntualidad) AS puntualidad,
          SUM(a.biblia) AS biblia,
          SUM(a.uniforme) AS uniforme,
          SUM(a.cuota) AS cuota
        FROM asistencia AS a
        JOIN usuarios AS u ON u.id = a.usuario_id AND u.rol = 'CONQUISTADOR' AND u.estado = 'ACTIVO'
        GROUP BY a.fecha
        ORDER BY a.fecha DESC
        LIMIT 8
      ) AS ultimas
      ORDER BY fecha ASC`
    );

    const totalConquistadores = avances.length;
    const sinUnidad = avances.filter((item) => item.unidadId === null);

    return res.json({
      totales: {
        conquistadores: totalConquistadores,
        consejeros: Number(contadores.consejeros),
        unidades: unidades.length,
        solicitudes_pendientes: Number(contadores.solicitudes_pendientes),
        especialidades_completadas: Number(contadores.especialidades_completadas),
        requisitos_firmados: Number(contadores.requisitos_firmados),
        avance_promedio: resumirGrupo(avances).avance_promedio
      },
      por_unidad: [
        ...unidades.map((unidad) => ({
          id: unidad.id,
          nombre: unidad.nombre,
          consejeros: unidad.consejeros ? unidad.consejeros.split(', ') : [],
          ...resumirGrupo(avances.filter((item) => item.unidadId === unidad.id))
        })),
        ...(sinUnidad.length ? [{ id: null, nombre: 'Sin unidad', consejeros: [], ...resumirGrupo(sinUnidad) }] : [])
      ],
      por_clase: clases.map((clase) => ({
        id: clase.id,
        nombre: clase.nombre,
        color_insignia: clase.color_insignia,
        requisitos_cargados: Number(clase.requisitos_cargados),
        ...resumirGrupo(avances.filter((item) => item.claseId === clase.id))
      })),
      asistencia: asistencia.map((dia) => {
        const registrados = Number(dia.registrados);
        const presentes = Number(dia.presentes);
        const porcentajeDe = (valor) => (presentes ? Math.round((Number(valor) / presentes) * 100) : 0);
        return {
          fecha: dia.fecha,
          registrados,
          presentes,
          porcentaje_presentes: registrados ? Math.round((presentes / registrados) * 100) : 0,
          // Sobre los presentes: de los que vinieron, cuántos llegaron puntuales, con Biblia, etc.
          puntualidad: porcentajeDe(dia.puntualidad),
          biblia: porcentajeDe(dia.biblia),
          uniforme: porcentajeDe(dia.uniforme),
          cuota: porcentajeDe(dia.cuota)
        };
      })
    });
  } catch (error) {
    console.error('Error en GET /api/director/metricas:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { listarSolicitudes, obtenerCatalogo, responderSolicitud, obtenerMetricas };
