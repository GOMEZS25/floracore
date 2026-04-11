const express = require('express');

const router = express.Router();

// Importar controladores
const {
    crearSiembra,
    listarSiembras,
    obtenerSiembra,
    cerrarSiembra,
} = require('../controllers/sowing.controller');

// Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');

// Siembras
router.post('/', verificarToken, crearSiembra);
router.get('/', verificarToken, listarSiembras);
router.get('/:id', verificarToken, obtenerSiembra);
router.patch('/:id/close', verificarToken, cerrarSiembra);

// Exportar router
module.exports = router;
