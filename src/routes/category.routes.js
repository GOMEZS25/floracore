const express = require('express');

const router = express.Router();

//Importar controladores
const { crearCategoria } = require('../controllers/category.controller');

//Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');

//Crear categoria
router.post('/', verificarToken, crearCategoria);

//Exportar router
module.exports = router;