const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { obtenerCuadernillo, actualizarLecturaBiblica } = require('../controllers/cuadernilloController');
const { obtenerInicio } = require('../controllers/inicioController');

const router = express.Router();

router.get('/inicio', requireAuth, requireRole('CONQUISTADOR'), obtenerInicio);
router.get('/cuadernillo', requireAuth, requireRole('CONQUISTADOR'), obtenerCuadernillo);
router.patch('/cuadernillo/requisitos/:requisitoId/lecturas', requireAuth, requireRole('CONQUISTADOR'), actualizarLecturaBiblica);

module.exports = router;
