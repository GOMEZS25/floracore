const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

// ─── Helper: detectar ciclos en la jerarquía ──────────────────────────────────
// Sube por la cadena de padres partiendo desde `startParentId`.
// Si en algún momento encuentra `targetId`, existe un ciclo.
const detectarCiclo = async (startParentId, targetId) => {
    let currentId = startParentId;
    while (currentId !== null) {
        if (currentId === targetId) return true;
        const cat = await prisma.category.findUnique({
            where: { category_id: currentId },
            select: { parent_id: true },
        });
        if (!cat) break;
        currentId = cat.parent_id; // BigInt | null
    }
    return false;
};

// ─── Crear categoría ───────────────────────────────────────────────────────────
const crearCategoria = async (req, res) => {
    try {
        const { name, reference, parent_id } = req.body;

        // Obtener el id del usuario que genera la categoría
        const { id: userId } = req.usuario;
        const createdBy = BigInt(userId);

        // Validar campos obligatorios
        if (!name || !reference) {
            return res.status(400).json({ mensaje: 'Los campos name y reference son obligatorios' });
        }

        // Validar duplicados (name / reference)
        const categoryExists = await prisma.category.findFirst({
            where: {
                OR: [{ name }, { reference }],
            },
        });

        if (categoryExists) {
            return res.status(400).json({ mensaje: 'La categoría o referencia ya existe' });
        }

        // Validar parent_id si viene
        let parentIdBigInt = null;
        if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
            parentIdBigInt = BigInt(parent_id);

            const padre = await prisma.category.findUnique({
                where: { category_id: parentIdBigInt },
                select: { category_id: true },
            });

            if (!padre) {
                return res.status(404).json({ mensaje: 'La categoría padre no existe' });
            }
        }

        // Crear la categoría
        const nuevaCategoria = await prisma.category.create({
            data: {
                name,
                reference,
                created_by: createdBy,
                ...(parentIdBigInt !== null && { parent_id: parentIdBigInt }),

            },
            select: {
                category_id: true,
                name: true,
                reference: true,
                is_active: true,
                created_by: true,
                created_at: true,
                parent_id: true,
                parent: {
                    select: { category_id: true, name: true },
                },
            },
        });

        res.status(201).json(serializeBigInt(nuevaCategoria));

    } catch (error) {
        console.error('Error al crear categoría:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

//Listar categorías
const listarCategorias = async (req, res) => {
    try {
        const categorias = await prisma.category.findMany({
            select: {
                category_id: true,
                name: true,
                reference: true,
                is_active: true,
                created_by: true,
                created_at: true,
                parent_id: true,
                parent: {
                    select: { category_id: true, name: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        const categoriasSerializadas = categorias.map(serializeBigInt);
        res.status(200).json(categoriasSerializadas);

    } catch (error) {
        console.error('Error al listar categorías:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

//  Actualizar categoría
const actualizarCategoria = async (req, res) => {
    try {
        const { id: categoryId } = req.params;
        const categoryIdBigInt = BigInt(categoryId);

        const { name, reference, is_active, parent_id } = req.body;

        // Validar campos obligatorios
        if (!name || !reference) {
            return res.status(400).json({ mensaje: 'Los campos name y reference son obligatorios' });
        }

        // Verificar que la categoría exista
        const categoriaActual = await prisma.category.findUnique({
            where: { category_id: categoryIdBigInt },
        });

        if (!categoriaActual) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }

        // Validar duplicados excluyendo la propia categoría
        const categoryExists = await prisma.category.findFirst({
            where: {
                OR: [{ name }, { reference }],
                NOT: { category_id: categoryIdBigInt },
            },
        });

        if (categoryExists) {
            return res.status(400).json({ mensaje: 'La categoría o referencia ya existe' });
        }

        // Validar parent_id si viene
        let parentIdBigInt = null;
        let clearParent = false;

        if (parent_id !== undefined) {
            if (parent_id === null || parent_id === '') {
                // Se quiere quitar el padre
                clearParent = true;
            } else {
                parentIdBigInt = BigInt(parent_id);

                // No puede ser su propio padre
                if (parentIdBigInt === categoryIdBigInt) {
                    return res.status(400).json({ mensaje: 'Una categoría no puede ser su propio padre' });
                }

                // Verificar que el padre existe
                const padre = await prisma.category.findUnique({
                    where: { category_id: parentIdBigInt },
                    select: { category_id: true },
                });

                if (!padre) {
                    return res.status(404).json({ mensaje: 'La categoría padre no existe' });
                }

                // Detectar ciclos: el padre propuesto no puede ser descendiente de la categoría actual
                const hayCiclo = await detectarCiclo(parentIdBigInt, categoryIdBigInt);
                if (hayCiclo) {
                    return res.status(400).json({
                        mensaje: 'No se puede asignar ese padre: crearía un ciclo en la jerarquía',
                    });
                }
            }
        }

        // Construir objeto de datos
        const data = {
            name,
            reference,
            ...(is_active !== undefined && { is_active }),
        };

        if (parentIdBigInt !== null) {
            data.parent_id = parentIdBigInt;
        } else if (clearParent) {
            data.parent_id = null;
        }

        const categoriaActualizada = await prisma.category.update({
            where: { category_id: categoryIdBigInt },
            data,
            select: {
                category_id: true,
                name: true,
                reference: true,
                is_active: true,
                created_by: true,
                created_at: true,
                parent_id: true,
                parent: {
                    select: { category_id: true, name: true },
                },
            },
        });

        res.status(200).json(serializeBigInt(categoriaActualizada));

    } catch (error) {
        console.error('Error al actualizar categoría:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

//  Eliminar categoría 
const eliminarCategoria = async (req, res) => {
    try {
        const { id: categoryId } = req.params;
        const categoryIdBigInt = BigInt(categoryId);

        // Validar que exista
        const categoria = await prisma.category.findUnique({
            where: { category_id: categoryIdBigInt },
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }

        // Validar que no tenga productos
        const productos = await prisma.product.findFirst({
            where: { category_id: categoryIdBigInt },
        });

        if (productos) {
            return res.status(400).json({
                mensaje: 'La categoría no puede ser eliminada porque tiene productos asociados',
            });
        }

        // Validar que no tenga subcategorías
        const hijos = await prisma.category.findFirst({
            where: { parent_id: categoryIdBigInt },
        });

        if (hijos) {
            return res.status(400).json({
                mensaje: 'La categoría no puede ser eliminada porque tiene subcategorías asociadas',
            });
        }

        await prisma.category.delete({
            where: { category_id: categoryIdBigInt },
        });

        res.status(200).json({ mensaje: 'Categoría eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar categoría:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Toggle activo/inactivo
const toggleCategoria = async (req, res) => {
    try {
        const { id: categoryId } = req.params;
        const categoryIdBigInt = BigInt(categoryId);

        // Verificar que la categoría existe
        const categoria = await prisma.category.findUnique({
            where: { category_id: categoryIdBigInt },
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }

        // Invertir el estado actual
        const categoriaActualizada = await prisma.category.update({
            where: { category_id: categoryIdBigInt },
            data: { is_active: !categoria.is_active },
            select: {
                category_id: true,
                name: true,
                reference: true,
                is_active: true,
                created_by: true,
                created_at: true,
                parent_id: true,
                parent: {
                    select: { category_id: true, name: true },
                },
            },
        });

        const estado = categoriaActualizada.is_active ? 'activada' : 'desactivada';

        res.status(200).json({
            mensaje: `Categoría ${estado} correctamente`,
            data: serializeBigInt(categoriaActualizada),
        });

    } catch (error) {
        console.error('Error al cambiar estado de categoría:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

module.exports = { crearCategoria, actualizarCategoria, listarCategorias, eliminarCategoria, toggleCategoria };