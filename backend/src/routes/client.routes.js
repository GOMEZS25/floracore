const express = require('express');

const router = express.Router();

const {
    crearCliente,
    listarClientes,
    obtenerCliente,
    actualizarCliente,
    desactivarCliente,
    agregarDireccion,
    desactivarDireccion,
    agregarContacto,
    desactivarContacto,
} = require('../controllers/client.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

// Clientes
router.post('/', verificarToken, checkPermission('CLIENTS', 'can_create'), crearCliente);
router.get('/', verificarToken, checkPermission('CLIENTS', 'can_view'), listarClientes);
router.get('/:id', verificarToken, checkPermission('CLIENTS', 'can_view'), obtenerCliente);
router.put('/:id', verificarToken, checkPermission('CLIENTS', 'can_edit'), actualizarCliente);
router.delete('/:id', verificarToken, checkPermission('CLIENTS', 'can_delete'), desactivarCliente);

// Direcciones
router.post('/:id/addresses', verificarToken, checkPermission('CLIENTS', 'can_create'), agregarDireccion);
router.delete('/addresses/:address_id', verificarToken, checkPermission('CLIENTS', 'can_delete'), desactivarDireccion);

// Contactos
router.post('/:id/contacts', verificarToken, checkPermission('CLIENTS', 'can_create'), agregarContacto);
router.delete('/contacts/:contact_id', verificarToken, checkPermission('CLIENTS', 'can_delete'), desactivarContacto);

//Exportar router
module.exports = router;
