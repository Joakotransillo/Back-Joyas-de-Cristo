// src/controllers/authController.js
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');
const { randomUUID } = require('crypto');

const parseOptionalId = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const id = typeof value === 'string' && /^\d+$/.test(value.trim())
    ? Number(value.trim())
    : value;

  return Number.isSafeInteger(id) && id > 0 ? id : NaN;
};

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date().toISOString().slice(0, 10);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today;
};

// Registrar Usuario
const register = async (req, res) => {
  const { nombre_completo, email, password, fecha_nacimiento, rol, unidad_id, clase_actual_id } = req.body;

  try {
    const [userExists] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (userExists.length > 0) {
      return res.status(400).json({ mensaje: 'El email ya está registrado' });
    }

    // Hashear contraseña con bcryptjs
    const password_hash = await hashPassword(password);

    const [newUser] = await pool.execute(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, fecha_nacimiento, rol, unidad_id, clase_actual_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre_completo, email, password_hash, fecha_nacimiento, rol || 'CONQUISTADOR', unidad_id || null, clase_actual_id || null]
    );

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: newUser.insertId,
        nombre_completo,
        email,
        rol: rol || 'CONQUISTADOR'
      }
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ mensaje: 'Error al registrar el usuario' });
  }
};

// Enviar una solicitud pública de alta para aprobación del Director.
const solicitarCuenta = async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const nombreCompleto = typeof body.nombre_completo === 'string' ? body.nombre_completo.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fechaNacimiento = body.fecha_nacimiento === undefined || body.fecha_nacimiento === null || body.fecha_nacimiento === ''
    ? null
    : body.fecha_nacimiento;
  const claseSugeridaId = parseOptionalId(body.clase_sugerida_id);
  const unidadSugeridaId = parseOptionalId(body.unidad_sugerida_id);

  if (!nombreCompleto || nombreCompleto.length > 150) {
    return res.status(400).json({ mensaje: 'El nombre completo es obligatorio y debe tener hasta 150 caracteres' });
  }

  if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ mensaje: 'Ingresá un email válido de hasta 150 caracteres' });
  }

  if (fechaNacimiento !== null && !isValidDateOnly(fechaNacimiento)) {
    return res.status(400).json({ mensaje: 'La fecha de nacimiento debe ser válida y no futura (AAAA-MM-DD)' });
  }

  if (Number.isNaN(claseSugeridaId) || Number.isNaN(unidadSugeridaId)) {
    return res.status(400).json({ mensaje: 'Los identificadores de clase y unidad deben ser enteros positivos' });
  }

  try {
    const [duplicateEmail] = await pool.execute(
      `SELECT 1 FROM usuarios WHERE LOWER(email) = ?
       UNION ALL
       SELECT 1 FROM solicitudes_registro WHERE LOWER(email) = ?
       LIMIT 1`,
      [email, email]
    );

    if (duplicateEmail.length > 0) {
      return res.status(409).json({ mensaje: 'Ya existe una cuenta o solicitud con ese email' });
    }

    if (claseSugeridaId !== null) {
      const [clase] = await pool.execute('SELECT id FROM clases WHERE id = ?', [claseSugeridaId]);
      if (clase.length === 0) {
        return res.status(400).json({ mensaje: 'La clase sugerida no existe' });
      }
    }

    if (unidadSugeridaId !== null) {
      const [unidad] = await pool.execute('SELECT id FROM unidades WHERE id = ?', [unidadSugeridaId]);
      if (unidad.length === 0) {
        return res.status(400).json({ mensaje: 'La unidad sugerida no existe' });
      }
    }

    const [solicitud] = await pool.execute(
      `INSERT INTO solicitudes_registro
        (nombre_completo, email, fecha_nacimiento, clase_sugerida_id, unidad_sugerida_id, estado)
       VALUES (?, ?, ?, ?, ?, 'PENDIENTE')`,
      [nombreCompleto, email, fechaNacimiento, claseSugeridaId, unidadSugeridaId]
    );

    return res.status(201).json({
      mensaje: 'Solicitud enviada y pendiente de revisión por el Director',
      solicitud: {
        id: solicitud.insertId,
        nombre_completo: nombreCompleto,
        email,
        fecha_nacimiento: fechaNacimiento,
        clase_sugerida_id: claseSugeridaId,
        unidad_sugerida_id: unidadSugeridaId,
        estado: 'PENDIENTE'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe una cuenta o solicitud con ese email' });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ mensaje: 'La clase o unidad sugerida no existe' });
    }

    console.error('Error en POST /api/auth/solicitar-cuenta:', error);
    return res.status(500).json({ mensaje: 'Error al enviar la solicitud' });
  }
};

// Iniciar Sesión
const login = async (req, res) => {
  const { email, password } = req.body || {};
  const emailLimpio = typeof email === 'string' ? email.trim() : '';

  // Validar los tipos y campos obligatorios antes de consultar la base de datos.
  if (!emailLimpio || emailLimpio.length > 150 || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
  }

  try {
    // Buscar solo los datos necesarios para autenticar y responder.
    const [usuarios] = await pool.execute(
      `SELECT id, nombre_completo, email, password_hash, rol, unidad_id, clase_actual_id, estado
       FROM usuarios
       WHERE email = ?`,
      [emailLimpio]
    );
    if (usuarios.length === 0) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    // Comprobar la contraseña antes de informar el estado de la cuenta.
    const isMatch = await comparePassword(password, usuario.password_hash);
    if (!isMatch) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({ mensaje: 'Cuenta inactiva o pendiente de aprobación' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) {
      console.error('JWT_SECRET no está configurado o tiene menos de 32 bytes');
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    // Firmar token JWT con una duración de 8 horas.
    const payload = {
      id: usuario.id,
      rol: usuario.rol,
      unidad_id: usuario.unidad_id
    };

    const jti = randomUUID();
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '8h',
      jwtid: jti
    });
    const tokenClaims = jwt.decode(token);

    await pool.execute(
      `INSERT INTO sesiones (jti, usuario_id, expira_en, creada_en)
       VALUES (?, ?, ?, UTC_TIMESTAMP(3))`,
      [jti, usuario.id, new Date(tokenClaims.exp * 1000)]
    );

    // 6. Enviar respuesta con JWT e información del usuario
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
        unidad_id: usuario.unidad_id,
        clase_actual_id: usuario.clase_actual_id
      }
    });
  } catch (error) {
    console.error('Error en POST /api/auth/login:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const obtenerPerfil = async (req, res) => {
  try {
    const [perfiles] = await pool.execute(
      `SELECT
        u.id,
        u.nombre_completo,
        u.email,
        u.fecha_nacimiento,
        u.rol,
         u.unidad_id,
         un.nombre AS unidad_nombre,
         u.clase_actual_id,
         c.nombre AS clase_nombre,
         c.color_insignia
      FROM usuarios u
      LEFT JOIN unidades un ON un.id = u.unidad_id
      LEFT JOIN clases c ON c.id = u.clase_actual_id
       WHERE u.id = ? AND u.estado = 'ACTIVO'`,
      [req.auth.userId]
    );

    if (perfiles.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const [especialidades] = await pool.execute(
      `SELECT e.id, e.nombre, e.categoria, eu.fecha_completado
       FROM especialidades_usuario eu
       JOIN especialidades e ON e.id = eu.especialidad_id
       WHERE eu.usuario_id = ?
       ORDER BY e.nombre`,
      [req.auth.userId]
    );

    const perfil = perfiles[0];
    return res.json({
      usuario: {
        id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        email: perfil.email,
        fecha_nacimiento: perfil.fecha_nacimiento,
        rol: perfil.rol,
        unidad_id: perfil.unidad_id,
        unidad: perfil.unidad_id === null
          ? null
          : { id: perfil.unidad_id, nombre: perfil.unidad_nombre },
        clase_actual_id: perfil.clase_actual_id,
        clase: perfil.clase_actual_id === null
          ? null
          : {
            id: perfil.clase_actual_id,
            nombre: perfil.clase_nombre,
            color_insignia: perfil.color_insignia
          },
        especialidades
      }
    });
  } catch (error) {
    console.error('Error en GET /api/auth/me:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const actualizarPerfil = async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};
  const camposPermitidos = ['nombre_completo', 'email', 'fecha_nacimiento'];
  const campoPresente = (campo) => Object.prototype.hasOwnProperty.call(body, campo);
  const campoNoPermitido = Object.keys(body).some((campo) => !camposPermitidos.includes(campo));

  if (campoNoPermitido) {
    return res.status(400).json({
      mensaje: 'Solo se pueden modificar nombre_completo, email y fecha_nacimiento'
    });
  }

  const actualizaciones = [];
  const valores = [];
  const agregarActualizacion = (columna, valor) => {
    valores.push(valor);
    actualizaciones.push(`${columna} = ?`);
  };

  if (campoPresente('nombre_completo')) {
    const nombre = typeof body.nombre_completo === 'string'
      ? body.nombre_completo.trim()
      : '';

    if (!nombre || nombre.length > 150) {
      return res.status(400).json({
        mensaje: 'El nombre completo es obligatorio y debe tener hasta 150 caracteres'
      });
    }

    agregarActualizacion('nombre_completo', nombre);
  }

  if (campoPresente('email')) {
    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';

    if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ mensaje: 'Ingresá un email válido de hasta 150 caracteres' });
    }

    try {
      const [existente] = await pool.execute(
        `SELECT 1
         FROM usuarios
         WHERE LOWER(email) = ?
           AND id <> ?
         LIMIT 1`,
        [email, req.auth.userId]
      );

      if (existente.length > 0) {
        return res.status(409).json({ mensaje: 'Ese email ya está registrado' });
      }
    } catch (error) {
      console.error('Error al validar email del perfil:', error);
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    agregarActualizacion('email', email);
  }

  if (campoPresente('fecha_nacimiento')) {
    const fecha = body.fecha_nacimiento === null || body.fecha_nacimiento === ''
      ? null
      : body.fecha_nacimiento;

    if (fecha !== null && !isValidDateOnly(fecha)) {
      return res.status(400).json({
        mensaje: 'La fecha de nacimiento debe ser válida y no futura (AAAA-MM-DD)'
      });
    }

    agregarActualizacion('fecha_nacimiento', fecha);
  }

  if (actualizaciones.length === 0) {
    return res.status(400).json({ mensaje: 'Indicá al menos un dato personal para actualizar' });
  }

  valores.push(req.auth.userId);

  try {
    await pool.execute(
      `UPDATE usuarios
       SET ${actualizaciones.join(', ')}
       WHERE id = ?
         AND estado = 'ACTIVO'`,
      valores
    );

    const [usuarios] = await pool.execute(
      `SELECT id, nombre_completo, email, fecha_nacimiento,
              rol, unidad_id, clase_actual_id
       FROM usuarios
       WHERE id = ? AND estado = 'ACTIVO'`,
      [req.auth.userId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    return res.json({
      mensaje: 'Perfil actualizado',
      usuario: usuarios[0]
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ese email ya está registrado' });
    }

    console.error('Error en PATCH /api/auth/me:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const cerrarSesion = async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE sesiones
       SET revocada_en = UTC_TIMESTAMP(3)
       WHERE jti = ?
         AND usuario_id = ?
         AND revocada_en IS NULL`,
      [req.auth.jti, req.auth.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(401).json({ mensaje: 'La sesión ya no está activa' });
    }

    return res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/auth/sesiones:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  register,
  solicitarCuenta,
  login,
  obtenerPerfil,
  actualizarPerfil,
  cerrarSesion
};
