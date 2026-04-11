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

// Clientes
router.post('/', verificarToken, crearCliente);
router.get('/', verificarToken, listarClientes);
router.get('/:id', verificarToken, obtenerCliente);
router.put('/:id', verificarToken, actualizarCliente);
router.delete('/:id', verificarToken, desactivarCliente);

// Direcciones
router.post('/:id/addresses', verificarToken, agregarDireccion);
router.delete('/addresses/:address_id', verificarToken, desactivarDireccion);

// Contactos
router.post('/:id/contacts', verificarToken, agregarContacto);
router.delete('/contacts/:contact_id', verificarToken, desactivarContacto);

//Exportar router
module.exports = router;
