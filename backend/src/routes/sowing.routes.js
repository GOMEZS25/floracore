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
const { checkPermission } = require('../middlewares/permission.middleware');

// Siembras
router.post('/', verificarToken, checkPermission('FARM', 'can_create'), crearSiembra);
router.get('/', verificarToken, checkPermission('FARM', 'can_view'), listarSiembras);
router.get('/:id', verificarToken, checkPermission('FARM', 'can_view'), obtenerSiembra);
router.patch('/:id/close', verificarToken, checkPermission('FARM', 'can_edit'), cerrarSiembra);

// Exportar router
module.exports = router;
