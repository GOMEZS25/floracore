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
    autoGuardarOrden,
    agregarLinea,
    actualizarLinea,
    eliminarLinea,
    asignarInventario,
    liberarAsignacion,
    updateOrderHeader
} = require('../controllers/salesOrder.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

router.post('/orders', verificarToken, checkPermission('SALES', 'can_create'), crearOrden);
router.get('/orders', verificarToken, checkPermission('SALES', 'can_view'), listarOrdenes);
router.get('/orders/next-number', verificarToken, getNextOrderNumber);

router.post('/orders/auto-save', verificarToken, checkPermission('SALES', 'can_create'), autoGuardarOrden);
router.post('/orders/:id/details', verificarToken, checkPermission('SALES', 'can_create'), agregarLinea);
router.patch('/orders/details/:detail_id', verificarToken, checkPermission('SALES', 'can_edit'), actualizarLinea);
router.delete('/orders/details/:detail_id', verificarToken, checkPermission('SALES', 'can_edit'), eliminarLinea);

// Asignación de inventario
router.post('/orders/details/:detail_id/assign', verificarToken, checkPermission('SALES', 'can_edit'), asignarInventario);
router.delete('/orders/assignments/:assignment_id', verificarToken, checkPermission('SALES', 'can_edit'), liberarAsignacion);

router.get('/orders/:id', verificarToken, checkPermission('SALES', 'can_view'), obtenerOrden);
router.patch('/orders/:id/approve', verificarToken, checkPermission('SALES', 'can_edit'), aprobarOrden);
router.patch('/orders/:id/dispatch', verificarToken, checkPermission('SALES', 'can_edit'), despacharOrden);
router.patch('/orders/:id/cancel', verificarToken, checkPermission('SALES', 'can_edit'), cancelarOrden);
router.patch('/orders/:id/update-header', verificarToken, checkPermission('SALES', 'can_edit'), updateOrderHeader);

module.exports = router;
