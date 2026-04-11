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

router.post('/', verificarToken, crearOrden);
router.get('/', verificarToken, listarOrdenes);
router.get('/:id', verificarToken, obtenerOrden);
router.patch('/:id/approve', verificarToken, aprobarOrden);
router.patch('/:id/dispatch', verificarToken, despacharOrden);
router.patch('/:id/cancel', verificarToken, cancelarOrden);

module.exports = router;
