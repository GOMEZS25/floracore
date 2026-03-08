const express = require('express');

const router = express.Router();

//Importar controladores
const { crearCategoria, listarCategorias } = require('../controllers/category.controller');

//Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');


//Crear categoria
router.post('/', verificarToken, crearCategoria);

//Listar categorias
router.get('/', verificarToken, listarCategorias);

//Exportar router
module.exports = router;