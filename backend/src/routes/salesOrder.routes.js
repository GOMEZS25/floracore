const express = require('express');

const router = express.Router();

const {
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    aprobarOrden,
    despacharOrden,
    cancelarOrden,
} = require('../controllers/salesOrder.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

router.post('/', verificarToken, checkPermission('SALES', 'can_create'), crearOrden);
router.get('/', verificarToken, checkPermission('SALES', 'can_view'), listarOrdenes);
router.get('/:id', verificarToken, checkPermission('SALES', 'can_view'), obtenerOrden);
router.patch('/:id/approve', verificarToken, checkPermission('SALES', 'can_edit'), aprobarOrden);
router.patch('/:id/dispatch', verificarToken, checkPermission('SALES', 'can_edit'), despacharOrden);
router.patch('/:id/cancel', verificarToken, checkPermission('SALES', 'can_edit'), cancelarOrden);

module.exports = router;
