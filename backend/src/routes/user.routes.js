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

router.post('/', verificarToken, crearUsuario);
router.get('/', verificarToken, listarUsuarios);
router.get('/:id', verificarToken, obtenerUsuario);
router.patch('/:id', verificarToken, actualizarUsuario);
router.patch('/:id/toggle', verificarToken, toggleUsuario);
router.patch('/:id/reset-password', verificarToken, resetPassword);

router.get('/:id/permissions', verificarToken, obtenerPermisos);
router.put('/:id/permissions', verificarToken, actualizarPermisos);

module.exports = router;
