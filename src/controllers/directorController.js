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

module.exports = { listarSolicitudes, obtenerCatalogo, responderSolicitud };
