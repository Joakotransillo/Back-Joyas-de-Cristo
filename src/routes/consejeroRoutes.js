const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { obtenerMiUnidad, evaluarRequisitos } = require('../controllers/consejeroController');

const router = express.Router();

router.get('/mi-unidad', requireAuth, requireRole('CONSEJERO'), obtenerMiUnidad);
router.post('/evaluar', requireAuth, requireRole('CONSEJERO'), evaluarRequisitos);

module.exports = router;
