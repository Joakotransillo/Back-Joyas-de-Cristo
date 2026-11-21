const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { obtenerMiUnidad } = require('../controllers/consejeroController');

const router = express.Router();

router.get('/mi-unidad', requireAuth, requireRole('CONSEJERO'), obtenerMiUnidad);

module.exports = router;
