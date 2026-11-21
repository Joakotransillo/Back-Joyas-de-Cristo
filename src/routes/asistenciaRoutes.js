const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { obtenerAsistencia, guardarAsistencia } = require('../controllers/asistenciaController');

const router = express.Router();

// Toman asistencia la secretaría, la dirección y cada consejero (este último, solo de su unidad).
const quienesTomanAsistencia = [requireAuth, requireRole('SECRETARIA', 'DIRECTOR', 'CONSEJERO')];

router.get('/asistencia', ...quienesTomanAsistencia, obtenerAsistencia);
router.post('/asistencia', ...quienesTomanAsistencia, guardarAsistencia);

module.exports = router;
