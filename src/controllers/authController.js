// src/controllers/authController.js
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');

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

module.exports = { register, login };
