const express = require('express');

const router = express.Router();

//Importar controladores
const { crearCategoria, listarCategorias, actualizarCategoria, eliminarCategoria, toggleCategoria } = require('../controllers/category.controller');

//Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');

//Crear categoria
router.post('/', verificarToken, crearCategoria);

//Listar categorias
router.get('/', verificarToken, listarCategorias);

//Actualizar categoria
router.put('/:id', verificarToken, actualizarCategoria);

//Eliminar categoria
router.delete('/:id', verificarToken, eliminarCategoria);

//Toggle activo/inactivo
router.patch('/:id/toggle', verificarToken, toggleCategoria);

//Exportar router
module.exports = router;