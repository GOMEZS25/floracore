const express = require('express');

const router = express.Router();

const { crearUsuario, listarUsuarios } = require('../controllers/user.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

// Crear la ruta POST '/' protegida con el middleware
router.post('/', verificarToken, crearUsuario);

//Crear ruta get para listar usuarios
router.get('/', verificarToken, listarUsuarios);

// Exportar router
module.exports = router;