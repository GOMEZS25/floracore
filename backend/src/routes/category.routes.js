const express = require('express');

const router = express.Router();

//Importar controladores
const { crearCategoria, listarCategorias, actualizarCategoria, eliminarCategoria, toggleCategoria } = require('../controllers/category.controller');

//Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

//Crear categoria
router.post('/', verificarToken, checkPermission('PRODUCTS', 'can_create'), crearCategoria);

//Listar categorias
router.get('/', verificarToken, checkPermission('PRODUCTS', 'can_view'), listarCategorias);

//Actualizar categoria
router.put('/:id', verificarToken, checkPermission('PRODUCTS', 'can_edit'), actualizarCategoria);

//Eliminar categoria
router.delete('/:id', verificarToken, checkPermission('PRODUCTS', 'can_delete'), eliminarCategoria);

//Toggle activo/inactivo
router.patch('/:id/toggle', verificarToken, checkPermission('PRODUCTS', 'can_edit'), toggleCategoria);

//Exportar router
module.exports = router;