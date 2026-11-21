const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');
const {
  listarSolicitudes,
  obtenerCatalogo,
  responderSolicitud,
  obtenerMetricas,
  listarUsuarios,
  editarUsuario,
  darDeBajaUsuario
} = require('../controllers/directorController');

const router = express.Router();

// La bandeja de solicitudes la manejan la dirección y la secretaría.
const soloAdministracion = [requireAuth, requireRole('DIRECTOR', 'SECRETARIA')];

router.get('/solicitudes', ...soloAdministracion, listarSolicitudes);
router.get('/catalogo', ...soloAdministracion, obtenerCatalogo);
router.get('/metricas', ...soloAdministracion, obtenerMetricas);

// Ver usuarios: dirección y secretaría. Cambiar roles o dar de baja: solo dirección.
const soloDireccion = [requireAuth, requireRole('DIRECTOR')];
router.get('/usuarios', ...soloAdministracion, listarUsuarios);
router.patch('/usuarios/:id', ...soloDireccion, editarUsuario);
router.delete('/usuarios/:id', ...soloDireccion, darDeBajaUsuario);
router.patch('/solicitudes/:id/responder', ...soloAdministracion, responderSolicitud);

module.exports = router;
