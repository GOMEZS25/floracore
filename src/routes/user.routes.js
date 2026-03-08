const express = require('express');

const router = express.Router();

//Importar controladores
const { crearUsuario, listarUsuarios, obtenerUsuario, actualizarUsuario } = require('../controllers/user.controller');

//Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');

// Crear la ruta POST '/' protegida con el middleware
router.post('/', verificarToken, crearUsuario);

//Crear ruta get para listar usuarios
router.get('/', verificarToken, listarUsuarios);

//Listar usuaririos
router.get("/:id", verificarToken, obtenerUsuario);


router.put("/:id", verificarToken, actualizarUsuario);


// Exportar router
module.exports = router;

