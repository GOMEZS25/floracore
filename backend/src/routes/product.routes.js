const express = require('express');

const router = express.Router();

const { crearProducto, listarProductos, actualizarProducto, eliminarProducto } = require('../controllers/product.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, crearProducto);

router.get('/', verificarToken, listarProductos);

router.put('/:id', verificarToken, actualizarProducto);

router.delete('/:id', verificarToken, eliminarProducto);

//Exportar router
module.exports = router;
