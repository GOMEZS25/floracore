const express = require('express');
const router = express.Router();

const { crearProducto, listarProductos, actualizarProducto, eliminarProducto } = require('../controllers/product.controller');

router.post('/', crearProducto);
router.get('/', listarProductos);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);

module.exports = router;