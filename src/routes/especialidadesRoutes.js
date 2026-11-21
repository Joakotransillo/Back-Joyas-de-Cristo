const express = require('express');
const { requireAuth } = require('../middlewares/authMiddleware');
const { listarEspecialidades, obtenerEspecialidad } = require('../controllers/especialidadesController');

const router = express.Router();

// Cualquier integrante con sesión puede ver el catálogo y las preguntas.
// El controlador decide si incluye el desarrollo según el rol.
router.get('/', requireAuth, listarEspecialidades);
router.get('/:id', requireAuth, obtenerEspecialidad);

module.exports = router;
