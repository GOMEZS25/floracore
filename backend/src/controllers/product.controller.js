const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

// ── Helper: generar iniciales (max N chars, uppercase) ─────────────────────────
const iniciales = (texto, max = 3) =>
    texto
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, max) || texto.slice(0, max).toUpperCase();

// ── Helper: producto cartesiano de arrays ──────────────────────────────────────
const cartesiano = (...arrays) =>
    arrays.reduce((acc, arr) =>
        acc.flatMap((combo) => arr.map((item) => [...combo, item])),
        [[]]
    );

// ── Helper: select estándar de producto ───────────────────────────────────────
const PRODUCT_SELECT = {
    product_id: true,
    sku: true,
    name: true,
    unit_of_measure: true,
    is_active: true,
    created_at: true,
    category: { select: { category_id: true, name: true, reference: true } },
    packaging: { select: { packaging_id: true, name: true, reference: true } },
    variants: {
        select: {
            variant_id: true,
            sku_variant: true,
            is_active: true,
            created_at: true,
            attributes: {
                select: {
                    id: true,
                    value: {
                        select: {
                            value_id: true,
                            value: true,
                            attribute: { select: { attribute_id: true, name: true } },
                        },
                    },
                },
            },
        },
    },
};

// ─── Crear producto ────────────────────────────────────────────────────────────
const crearProducto = async (req, res) => {
    try {
        const { name, category_id, unit_of_measure, packaging_id } = req.body;

        if (!name || !category_id || !unit_of_measure) {
            return res.status(400).json({
                mensaje: 'Los campos name, category_id y unit_of_measure son obligatorios',
            });
        }

        // Verificar que la categoría existe
        const categoria = await prisma.category.findUnique({
            where: { category_id: BigInt(category_id) },
            select: { category_id: true, name: true, reference: true },
        });
        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }

        // Verificar packaging si viene
        if (packaging_id) {
            const pkg = await prisma.packaging.findUnique({
                where: { packaging_id: Number(packaging_id) },
            });
            if (!pkg) return res.status(404).json({ mensaje: 'Empaque no encontrado' });
        }

        // Generar SKU: iniciales categoría + iniciales nombre + secuencial 3 dígitos
        const prefCat  = iniciales(categoria.reference || categoria.name, 3);
        const prefName = iniciales(name, 3);
        const base     = `${prefCat}${prefName}`;

        // Buscar cuántos SKUs con ese prefijo existen para el secuencial
        const countExistentes = await prisma.product.count({
            where: { sku: { startsWith: base } },
        });
        const sku = `${base}${String(countExistentes + 1).padStart(3, '0')}`;

        // Validar duplicado de name
        const duplicado = await prisma.product.findFirst({ where: { name: name.trim() } });
        if (duplicado) {
            return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre' });
        }

        const producto = await prisma.product.create({
            data: {
                name: name.trim(),
                sku,
                category_id: BigInt(category_id),
                unit_of_measure,
                is_active: false,
                ...(packaging_id && { packaging_id: Number(packaging_id) }),
            },
            select: PRODUCT_SELECT,
        });

        res.status(201).json({
            mensaje: 'Producto creado correctamente',
            data: serializeBigInt(producto),
        });
    } catch (error) {
        console.error('Error al crear producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Listar productos ──────────────────────────────────────────────────────────
const listarProductos = async (req, res) => {
    try {
        const { name, sku, category_id, unit_of_measure, is_active } = req.query;

        const where = {};
        if (name)           where.name          = { contains: name };
        if (sku)            where.sku            = { contains: sku };
        if (category_id)    where.category_id    = BigInt(category_id);
        if (unit_of_measure) where.unit_of_measure = unit_of_measure;
        if (is_active !== undefined && is_active !== '')
            where.is_active = is_active === 'true';

        const productos = await prisma.product.findMany({
            where,
            select: PRODUCT_SELECT,
            orderBy: { name: 'asc' },
        });

        res.status(200).json(productos.map(serializeBigInt));
    } catch (error) {
        console.error('Error al listar productos:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Obtener producto por ID ───────────────────────────────────────────────────
const obtenerProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await prisma.product.findUnique({
            where: { product_id: BigInt(id) },
            select: PRODUCT_SELECT,
        });

        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        res.status(200).json(serializeBigInt(producto));
    } catch (error) {
        console.error('Error al obtener producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Actualizar producto ───────────────────────────────────────────────────────
const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = BigInt(id);
        const { name, category_id, unit_of_measure, packaging_id } = req.body;

        if (!name || !category_id || !unit_of_measure) {
            return res.status(400).json({
                mensaje: 'Los campos name, category_id y unit_of_measure son obligatorios',
            });
        }

        const producto = await prisma.product.findUnique({ where: { product_id: productId } });
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        const categoria = await prisma.category.findUnique({
            where: { category_id: BigInt(category_id) },
        });
        if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada' });

        if (packaging_id) {
            const pkg = await prisma.packaging.findUnique({
                where: { packaging_id: Number(packaging_id) },
            });
            if (!pkg) return res.status(404).json({ mensaje: 'Empaque no encontrado' });
        }

        // Validar duplicado de name excluyendo el propio
        const duplicado = await prisma.product.findFirst({
            where: { name: name.trim(), NOT: { product_id: productId } },
        });
        if (duplicado) {
            return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre' });
        }

        const actualizado = await prisma.product.update({
            where: { product_id: productId },
            data: {
                name: name.trim(),
                category_id: BigInt(category_id),
                unit_of_measure,
                packaging_id: packaging_id ? Number(packaging_id) : null,
            },
            select: PRODUCT_SELECT,
        });

        res.status(200).json({
            mensaje: 'Producto actualizado correctamente',
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Toggle producto ───────────────────────────────────────────────────────────
const toggleProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = BigInt(id);

        const producto = await prisma.product.findUnique({ where: { product_id: productId } });
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        const actualizado = await prisma.product.update({
            where: { product_id: productId },
            data: { is_active: !producto.is_active },
            select: { product_id: true, name: true, sku: true, is_active: true },
        });

        const estado = actualizado.is_active ? 'activado' : 'desactivado';
        res.status(200).json({
            mensaje: `Producto ${estado} correctamente`,
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al cambiar estado de producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Eliminar producto (lógica existente conservada) ──────────────────────────
const eliminarProducto = async (req, res) => {
    try {
        const { id: product_id } = req.params;

        const productExists = await prisma.product.findUnique({
            where: { product_id: BigInt(product_id) },
        });
        if (!productExists) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        const productUsed = await prisma.lote.findFirst({
            where: { product_id: BigInt(product_id) },
        });

        if (productUsed) {
            const productInactive = await prisma.product.update({
                where: { product_id: BigInt(product_id) },
                data: { is_active: false },
            });
            return res.status(200).json({
                mensaje: 'Producto inactivado por tener movimientos registrados',
                data: serializeBigInt(productInactive),
            });
        }

        await prisma.product.delete({ where: { product_id: BigInt(product_id) } });
        res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// VARIANTES
// ══════════════════════════════════════════════════════════════════════════════

const VARIANT_SELECT = {
    variant_id: true,
    product_id: true,
    sku_variant: true,
    is_active: true,
    created_at: true,
    attributes: {
        select: {
            id: true,
            value: {
                select: {
                    value_id: true,
                    value: true,
                    attribute: { select: { attribute_id: true, name: true } },
                },
            },
        },
    },
};

// ─── Generar variantes por combinaciones ───────────────────────────────────────
const generarVariantes = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = BigInt(id);
        const { value_ids } = req.body;

        if (!Array.isArray(value_ids) || value_ids.length === 0) {
            return res.status(400).json({ mensaje: 'Se requiere un array de value_ids no vacío' });
        }

        // Verificar que el producto existe y obtener su SKU base
        const producto = await prisma.product.findUnique({
            where: { product_id: productId },
            select: { product_id: true, sku: true },
        });
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        // Cargar los values con su attribute_id
        const values = await prisma.attributeValue.findMany({
            where: { value_id: { in: value_ids.map((v) => BigInt(v)) } },
            select: { value_id: true, value: true, attribute_id: true },
        });

        if (values.length === 0) {
            return res.status(400).json({ mensaje: 'Ningún value_id es válido' });
        }

        // Agrupar por attribute_id → { attr1: [v1,v2], attr2: [v3,v4] }
        const porAtributo = values.reduce((acc, v) => {
            const key = String(v.attribute_id);
            if (!acc[key]) acc[key] = [];
            acc[key].push(v);
            return acc;
        }, {});

        // Producto cartesiano de los grupos
        const grupos = Object.values(porAtributo);
        const combinaciones = cartesiano(...grupos); // [ [v1,v3], [v1,v4], [v2,v3], [v2,v4] ]

        const creadas = [];
        const omitidas = [];

        await prisma.$transaction(async (tx) => {
            for (const combo of combinaciones) {
                // SKU variante: SKU_BASE + iniciales de cada value (max 3 chars c/u)
                const sufijo = combo.map((v) => iniciales(v.value, 3)).join('');
                const skuVariant = `${producto.sku}-${sufijo}`;

                // Si ya existe, omitir
                const existe = await tx.productVariant.findUnique({
                    where: { sku_variant: skuVariant },
                });
                if (existe) {
                    omitidas.push(skuVariant);
                    continue;
                }

                // Crear la variante
                const variante = await tx.productVariant.create({
                    data: {
                        product_id: productId,
                        sku_variant: skuVariant,
                        is_active: false,
                        attributes: {
                            create: combo.map((v) => ({ value_id: v.value_id })),
                        },
                    },
                    select: VARIANT_SELECT,
                });

                creadas.push(serializeBigInt(variante));
            }
        });

        res.status(201).json({
            mensaje: `${creadas.length} variante(s) creada(s), ${omitidas.length} omitida(s) por SKU duplicado`,
            data: { creadas, omitidas },
        });
    } catch (error) {
        console.error('Error al generar variantes:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Listar variantes ──────────────────────────────────────────────────────────
const listarVariantes = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = BigInt(id);

        const producto = await prisma.product.findUnique({ where: { product_id: productId } });
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        const variantes = await prisma.productVariant.findMany({
            where: { product_id: productId },
            select: VARIANT_SELECT,
            orderBy: { sku_variant: 'asc' },
        });

        res.status(200).json(variantes.map(serializeBigInt));
    } catch (error) {
        console.error('Error al listar variantes:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Toggle variante ───────────────────────────────────────────────────────────
const toggleVariante = async (req, res) => {
    try {
        const { id, variantId } = req.params;
        const productId  = BigInt(id);
        const variantIdBigInt = BigInt(variantId);

        const variante = await prisma.productVariant.findFirst({
            where: { variant_id: variantIdBigInt, product_id: productId },
        });
        if (!variante) {
            return res.status(404).json({ mensaje: 'Variante no encontrada para este producto' });
        }

        const actualizada = await prisma.productVariant.update({
            where: { variant_id: variantIdBigInt },
            data: { is_active: !variante.is_active },
            select: VARIANT_SELECT,
        });

        const estado = actualizada.is_active ? 'activada' : 'desactivada';
        res.status(200).json({
            mensaje: `Variante ${estado} correctamente`,
            data: serializeBigInt(actualizada),
        });
    } catch (error) {
        console.error('Error al cambiar estado de variante:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Eliminar variante ─────────────────────────────────────────────────────────
const eliminarVariante = async (req, res) => {
    try {
        const { id, variantId } = req.params;
        const productId       = BigInt(id);
        const variantIdBigInt = BigInt(variantId);

        const variante = await prisma.productVariant.findFirst({
            where: { variant_id: variantIdBigInt, product_id: productId },
        });
        if (!variante) {
            return res.status(404).json({ mensaje: 'Variante no encontrada para este producto' });
        }

        // Verificar que no esté asociada a Lotes
        const enLote = await prisma.lote.findFirst({
            where: { product_id: productId }, // no hay variant_id en Lote; protección básica
        });

        // Verificar que no esté en SalesOrderDetail (tampoco tiene variant_id directo)
        // La restricción real es vía ProductVariantAttribute → AttributeValue → Restrict
        // Bloqueamos si la variante tiene atributos asociados a órdenes activas sería complejo;
        // por ahora verificamos integridad con Prisma onDelete Restrict.
        // Si quieres un chequeo explícito a futuro, aquí se agregaría.

        await prisma.$transaction(async (tx) => {
            // Eliminar atributos de la variante primero (Cascade no aplica en delete manual)
            await tx.productVariantAttribute.deleteMany({
                where: { variant_id: variantIdBigInt },
            });
            await tx.productVariant.delete({ where: { variant_id: variantIdBigInt } });
        });

        res.status(200).json({ mensaje: 'Variante eliminada correctamente' });
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({
                mensaje: 'No se puede eliminar la variante porque está asociada a lotes u órdenes de venta',
            });
        }
        console.error('Error al eliminar variante:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

module.exports = {
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
};