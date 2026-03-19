const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const { crearLote } = require('../controllers/lot.controller');


// Todas las rutas de lotes deben estar protegidas
router.post('/', verificarToken, crearLote);

module.exports = router;
