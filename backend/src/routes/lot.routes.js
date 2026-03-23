const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const { crearLote, listarLotes, actualizarLote, eliminarLote } = require('../controllers/lot.controller');


// Todas las rutas de lotes deben estar protegidas
router.post('/', verificarToken, crearLote);
router.get('/', verificarToken, listarLotes)
router.patch("/:lote_id", verificarToken, actualizarLote)
router.delete('/:lote_id', verificarToken, eliminarLote);

module.exports = router;
