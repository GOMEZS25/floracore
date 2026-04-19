const express = require('express');

const router = express.Router();

const { crearBodega, listarBodegas, actualizarBodega, toggleBodega } = require('../controllers/inventory.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

router.get('/', verificarToken, checkPermission('INVENTORY', 'can_view'), listarBodegas);
router.post('/', verificarToken, checkPermission('INVENTORY', 'can_create'), crearBodega);
router.put('/:id', verificarToken, checkPermission('INVENTORY', 'can_edit'), actualizarBodega);
router.patch('/:id/toggle', verificarToken, checkPermission('INVENTORY', 'can_edit'), toggleBodega);

module.exports = router;