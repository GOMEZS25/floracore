const express = require('express');

const router = express.Router();

// Importar controladores
const { obtenerDisponibilidad, obtenerDemandaEstimada } = require('../controllers/projection.controller');

// Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

// Proyecciones
router.get('/availability', verificarToken, checkPermission('FARM', 'can_view'), obtenerDisponibilidad);
router.get('/demand', verificarToken, checkPermission('FARM', 'can_view'), obtenerDemandaEstimada);

// Exportar router
module.exports = router;
