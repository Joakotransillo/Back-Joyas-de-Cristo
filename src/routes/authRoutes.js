const express = require('express');
const { login, solicitarCuenta } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/solicitar-cuenta', solicitarCuenta);

module.exports = router;
