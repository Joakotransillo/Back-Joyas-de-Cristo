// src/utils/passwordHelper.js
const bcrypt = require('bcryptjs');

/**
 * Genera un hash seguro para una contraseña en texto plano
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compara una contraseña ingresada contra el hash almacenado
 */
const comparePassword = async (password, storedHash) => {
  return await bcrypt.compare(password, storedHash);
};

module.exports = {
  hashPassword,
  comparePassword
};