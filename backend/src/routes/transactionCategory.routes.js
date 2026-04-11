const express = require('express');

const router = express.Router();

const {
    crearCategoria,
    listarCategorias,
    actualizarCategoria,
    toggleCategoria,
} = require('../controllers/transactionCategory.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, crearCategoria);
router.get('/', verificarToken, listarCategorias);
router.put('/:id', verificarToken, actualizarCategoria);
router.patch('/:id/toggle', verificarToken, toggleCategoria);

module.exports = router;
