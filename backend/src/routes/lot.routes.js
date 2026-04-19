const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');
const { crearLote, listarLotes, actualizarLote, eliminarLote, adicionarCantidad } = require('../controllers/lot.controller');


// Todas las rutas de lotes deben estar protegidas
router.post('/', verificarToken, checkPermission('INVENTORY', 'can_create'), crearLote);
router.get('/', verificarToken, checkPermission('INVENTORY', 'can_view'), listarLotes);
router.patch('/:lote_id/add', verificarToken, checkPermission('INVENTORY', 'can_edit'), adicionarCantidad);
router.patch("/:lote_id", verificarToken, checkPermission('INVENTORY', 'can_edit'), actualizarLote);
router.delete('/:lote_id', verificarToken, checkPermission('INVENTORY', 'can_delete'), eliminarLote);

module.exports = router;
