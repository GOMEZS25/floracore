const express = require('express');

// Router principal de atributos
const router = express.Router();

// Router de valores — mergeParams permite acceder a :id del router padre
const valuesRouter = express.Router({ mergeParams: true });

// Importar controladores
const {
    crearAtributo,
    listarAtributos,
    actualizarAtributo,
    toggleAtributo,
    agregarValor,
    listarValores,
    toggleValor,
    eliminarValor,
} = require('../controllers/attribute.controller');

// Importar middleware
const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

// ─── Rutas de Attribute ────────────────────────────────────────────────────────

// Crear atributo
router.post('/', verificarToken, checkPermission('SETTINGS', 'can_create'), crearAtributo);

// Listar atributos (con filtros opcionales ?name=&is_active=)
router.get('/', verificarToken, checkPermission('SETTINGS', 'can_view'), listarAtributos);

// Actualizar nombre de atributo
router.patch('/:id', verificarToken, checkPermission('SETTINGS', 'can_edit'), actualizarAtributo);

// Toggle activo/inactivo de atributo
router.patch('/:id/toggle', verificarToken, checkPermission('SETTINGS', 'can_edit'), toggleAtributo);

// ─── Rutas de AttributeValue (subrutas) ───────────────────────────────────────

// Agregar valor al atributo
valuesRouter.post('/', verificarToken, checkPermission('SETTINGS', 'can_create'), agregarValor);

// Listar valores del atributo
valuesRouter.get('/', verificarToken, checkPermission('SETTINGS', 'can_view'), listarValores);

// Toggle activo/inactivo de un valor
valuesRouter.patch('/:valueId/toggle', verificarToken, checkPermission('SETTINGS', 'can_edit'), toggleValor);

// Eliminar un valor
valuesRouter.delete('/:valueId', verificarToken, checkPermission('SETTINGS', 'can_delete'), eliminarValor);

// Montar subrutas de valores en el router principal
router.use('/:id/values', valuesRouter);

// Exportar router
module.exports = router;
