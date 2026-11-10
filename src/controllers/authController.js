// src/controllers/authController.js
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');

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
    const userExists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ mensaje: 'El email ya está registrado' });
    }

    // Hashear contraseña con bcryptjs
    const password_hash = await hashPassword(password);

    const newUser = await pool.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, fecha_nacimiento, rol, unidad_id, clase_actual_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nombre_completo, email, rol`,
      [nombre_completo, email, password_hash, fecha_nacimiento, rol || 'CONQUISTADOR', unidad_id || null, clase_actual_id || null]
    );

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: newUser.rows[0]
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
    const duplicateEmail = await pool.query(
      `SELECT 1 FROM usuarios WHERE LOWER(email) = $1
       UNION ALL
       SELECT 1 FROM solicitudes_registro WHERE LOWER(email) = $1
       LIMIT 1`,
      [email]
    );

    if (duplicateEmail.rows.length > 0) {
      return res.status(409).json({ mensaje: 'Ya existe una cuenta o solicitud con ese email' });
    }

    if (claseSugeridaId !== null) {
      const clase = await pool.query('SELECT id FROM clases WHERE id = $1', [claseSugeridaId]);
      if (clase.rows.length === 0) {
        return res.status(400).json({ mensaje: 'La clase sugerida no existe' });
      }
    }

    if (unidadSugeridaId !== null) {
      const unidad = await pool.query('SELECT id FROM unidades WHERE id = $1', [unidadSugeridaId]);
      if (unidad.rows.length === 0) {
        return res.status(400).json({ mensaje: 'La unidad sugerida no existe' });
      }
    }

    const solicitud = await pool.query(
      `INSERT INTO solicitudes_registro
        (nombre_completo, email, fecha_nacimiento, clase_sugerida_id, unidad_sugerida_id, estado)
       VALUES ($1, $2, $3, $4, $5, 'PENDIENTE')
       RETURNING id, nombre_completo, email, fecha_nacimiento,
                 clase_sugerida_id, unidad_sugerida_id, estado`,
      [nombreCompleto, email, fechaNacimiento, claseSugeridaId, unidadSugeridaId]
    );

    return res.status(201).json({
      mensaje: 'Solicitud enviada y pendiente de revisión por el Director',
      solicitud: solicitud.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ mensaje: 'Ya existe una cuenta o solicitud con ese email' });
    }

    if (error.code === '23503') {
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
    const userQuery = await pool.query(
      `SELECT id, nombre_completo, email, password_hash, rol, unidad_id, clase_actual_id, estado
       FROM usuarios
       WHERE email = $1`,
      [emailLimpio]
    );
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const usuario = userQuery.rows[0];

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

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '8h' });

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

module.exports = { register, solicitarCuenta, login };
