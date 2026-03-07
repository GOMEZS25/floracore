const express = require('express');

const router = express.Router();

const { crearUsuario, listarUsuarios, obtenerUsuario } = require('../controllers/user.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

// Crear la ruta POST '/' protegida con el middleware
router.post('/', verificarToken, crearUsuario);

//Crear ruta get para listar usuarios
router.get('/', verificarToken, listarUsuarios);

//Listar usuaririos
router.get("/:id", obtenerUsuario);

// Exportar router
module.exports = router;