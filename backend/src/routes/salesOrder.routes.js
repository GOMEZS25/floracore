const express = require('express');

const router = express.Router();

const {
    getNextOrderNumber,
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    aprobarOrden,
    despacharOrden,
    cancelarOrden,
} = require('../controllers/salesOrder.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

router.post('/orders', verificarToken, checkPermission('SALES', 'can_create'), crearOrden);
router.get('/orders', verificarToken, checkPermission('SALES', 'can_view'), listarOrdenes);
router.get('/orders/next-number', verificarToken, getNextOrderNumber);
router.get('/orders/:id', verificarToken, checkPermission('SALES', 'can_view'), obtenerOrden);
router.patch('/orders/:id/approve', verificarToken, checkPermission('SALES', 'can_edit'), aprobarOrden);
router.patch('/orders/:id/dispatch', verificarToken, checkPermission('SALES', 'can_edit'), despacharOrden);
router.patch('/orders/:id/cancel', verificarToken, checkPermission('SALES', 'can_edit'), cancelarOrden);

module.exports = router;
