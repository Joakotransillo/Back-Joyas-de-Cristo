const express = require('express');
const {
  login,
  solicitarCuenta,
  obtenerPerfil,
  actualizarPerfil,
  cerrarSesion
} = require('../controllers/authController');
const requireAuth = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/solicitar-cuenta', solicitarCuenta);

router.get('/me', requireAuth, obtenerPerfil);
router.patch('/me', requireAuth, actualizarPerfil);
router.delete('/sesiones', requireAuth, cerrarSesion);

module.exports = router;
