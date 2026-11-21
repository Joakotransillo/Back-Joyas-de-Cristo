const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const { listarSolicitudes, obtenerCatalogo, responderSolicitud } = require('../controllers/directorController');

const router = express.Router();

// La bandeja de solicitudes la manejan la dirección y la secretaría.
const soloAdministracion = [requireAuth, requireRole('DIRECTOR', 'SECRETARIA')];

router.get('/solicitudes', ...soloAdministracion, listarSolicitudes);
router.get('/catalogo', ...soloAdministracion, obtenerCatalogo);
router.patch('/solicitudes/:id/responder', ...soloAdministracion, responderSolicitud);

module.exports = router;
