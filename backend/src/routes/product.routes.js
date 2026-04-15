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

// ─── Rutas de Producto base ────────────────────────────────────────────────────

// Crear producto
router.post('/', verificarToken, crearProducto);

// Listar productos (filtros opcionales: ?name=&sku=&category_id=&unit_of_measure=&is_active=)
router.get('/', verificarToken, listarProductos);

// Obtener producto por ID (con variantes completas)
router.get('/:id', verificarToken, obtenerProducto);

// Actualizar producto
router.patch('/:id', verificarToken, actualizarProducto);

// Toggle activo/inactivo
router.patch('/:id/toggle', verificarToken, toggleProducto);

// Eliminar producto
router.delete('/:id', verificarToken, eliminarProducto);

// ─── Rutas de Variantes (subrutas) ────────────────────────────────────────────

// Generar variantes por combinaciones de value_ids
variantsRouter.post('/generate', verificarToken, generarVariantes);

// Listar variantes de un producto
variantsRouter.get('/', verificarToken, listarVariantes);

// Toggle activo/inactivo de una variante
variantsRouter.patch('/:variantId/toggle', verificarToken, toggleVariante);

// Eliminar una variante
variantsRouter.delete('/:variantId', verificarToken, eliminarVariante);

// Montar subrutas de variantes en el router principal
router.use('/:id/variants', variantsRouter);

// Exportar router
module.exports = router;
