const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { obtenerCuadernilloDeConquistador } = require('../controllers/consejeroCuadernilloController');

const router = express.Router();

// Se monta en /api/consejero junto a consejeroRoutes.
router.get('/conquistadores/:id/cuadernillo', requireAuth, requireRole('CONSEJERO'), obtenerCuadernilloDeConquistador);

module.exports = router;
