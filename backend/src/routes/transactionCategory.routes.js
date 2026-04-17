const express = require('express');

const router = express.Router();

const {
    crearCategoria,
    listarCategorias,
    actualizarCategoria,
    toggleCategoria,
} = require('../controllers/transactionCategory.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

router.post('/', verificarToken, checkPermission('SALES', 'can_create'), crearCategoria);
router.get('/', verificarToken, checkPermission('SALES', 'can_view'), listarCategorias);
router.put('/:id', verificarToken, checkPermission('SALES', 'can_edit'), actualizarCategoria);
router.patch('/:id/toggle', verificarToken, checkPermission('SALES', 'can_edit'), toggleCategoria);

module.exports = router;
