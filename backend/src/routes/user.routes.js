const express = require('express');
const router = express.Router();

const {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    toggleUsuario,
    resetPassword,
    obtenerPermisos,
    actualizarPermisos,
} = require('../controllers/user.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

router.post('/', verificarToken, checkPermission('SETTINGS', 'can_create'), crearUsuario);
router.get('/', verificarToken, checkPermission('SETTINGS', 'can_view'), listarUsuarios);
router.get('/:id', verificarToken, checkPermission('SETTINGS', 'can_view'), obtenerUsuario);
router.patch('/:id', verificarToken, checkPermission('SETTINGS', 'can_edit'), actualizarUsuario);
router.patch('/:id/toggle', verificarToken, checkPermission('SETTINGS', 'can_edit'), toggleUsuario);
router.patch('/:id/reset-password', verificarToken, checkPermission('SETTINGS', 'can_edit'), resetPassword);

router.get('/:id/permissions', verificarToken, checkPermission('SETTINGS', 'can_view'), obtenerPermisos);
router.put('/:id/permissions', verificarToken, checkPermission('SETTINGS', 'can_edit'), actualizarPermisos);

module.exports = router;
