const express = require('express');

const router = express.Router();

const { crearBodega, listarBodegas, actualizarBodega, inactivarBodega } = require('../controllers/inventory.controller');

router.post('/crear-bodega', crearBodega);
router.get('/listar-bodegas', listarBodegas);
router.put('/actualizar-bodega/:id', actualizarBodega);
router.patch('/inactivar-bodega/:id', inactivarBodega);

module.exports = router;