const express = require('express');
const router = express.Router({ mergeParams: true });
const { verificarToken } = require('../middlewares/auth.middleware');
const { crearMovimiento } = require('../controllers/movimientos.controller');


// Todas las rutas de lotes deben estar protegidas
router.post('/', verificarToken, crearMovimiento);

module.exports = router;
