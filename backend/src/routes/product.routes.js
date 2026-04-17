const express = require('express');

const router = express.Router();

// Router de variantes — mergeParams permite acceder a :id del router padre
const variantsRouter = express.Router({ mergeParams: true });

const {
    crearProducto,
    listarProductos,
    obtenerProducto,
    actualizarProducto,
    toggleProducto,
    eliminarProducto,
    generarVariantes,
    listarVariantes,
    toggleVariante,
    eliminarVariante,
} = require('../controllers/product.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');

// ─── Rutas de Producto base ────────────────────────────────────────────────────

// Crear producto
router.post('/', verificarToken, checkPermission('PRODUCTS', 'can_create'), crearProducto);

// Listar productos (filtros opcionales: ?name=&sku=&category_id=&unit_of_measure=&is_active=)
router.get('/', verificarToken, checkPermission('PRODUCTS', 'can_view'), listarProductos);

// Obtener producto por ID (con variantes completas)
router.get('/:id', verificarToken, checkPermission('PRODUCTS', 'can_view'), obtenerProducto);

// Actualizar producto
router.patch('/:id', verificarToken, checkPermission('PRODUCTS', 'can_edit'), actualizarProducto);

// Toggle activo/inactivo
router.patch('/:id/toggle', verificarToken, checkPermission('PRODUCTS', 'can_edit'), toggleProducto);

// Eliminar producto
router.delete('/:id', verificarToken, checkPermission('PRODUCTS', 'can_delete'), eliminarProducto);

// ─── Rutas de Variantes (subrutas) ────────────────────────────────────────────

// Generar variantes por combinaciones de value_ids
variantsRouter.post('/generate', verificarToken, checkPermission('PRODUCTS', 'can_create'), generarVariantes);

// Listar variantes de un producto
variantsRouter.get('/', verificarToken, checkPermission('PRODUCTS', 'can_view'), listarVariantes);

// Toggle activo/inactivo de una variante
variantsRouter.patch('/:variantId/toggle', verificarToken, checkPermission('PRODUCTS', 'can_edit'), toggleVariante);

// Eliminar una variante
variantsRouter.delete('/:variantId', verificarToken, checkPermission('PRODUCTS', 'can_delete'), eliminarVariante);

// Montar subrutas de variantes en el router principal
router.use('/:id/variants', variantsRouter);

// Exportar router
module.exports = router;
