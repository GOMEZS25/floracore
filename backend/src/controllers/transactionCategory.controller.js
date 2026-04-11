const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear categoría de transacción
const crearCategoria = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
        }

        const categoriaExistente = await prisma.transactionCategory.findUnique({
            where: { name }
        });

        if (categoriaExistente) {
            return res.status(400).json({ mensaje: 'Ya existe una categoría con ese nombre' });
        }

        const categoria = await prisma.transactionCategory.create({
            data: {
                name,
                description
            }
        });

        return res.status(201).json({
            mensaje: 'Categoría de transacción creada exitosamente',
            data: categoria,
        });

    } catch (error) {
        console.error('Error al crear categoría de transacción:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Listar categorías (filtro opcional: is_active)
const listarCategorias = async (req, res) => {
    try {
        const { is_active } = req.query;
        const where = {};

        if (is_active !== undefined) {
            where.is_active = is_active === 'true';
        }

        const categorias = await prisma.transactionCategory.findMany({
            where,
            orderBy: { name: 'asc' }
        });

        return res.status(200).json({
            mensaje: 'Categorías listadas exitosamente',
            data: categorias,
        });

    } catch (error) {
        console.error('Error al listar categorías de transacción:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Actualizar categoría
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
        }

        const categoria = await prisma.transactionCategory.findUnique({
            where: { category_id: Number(id) }
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }

        const duplicado = await prisma.transactionCategory.findFirst({
            where: {
                name,
                NOT: { category_id: Number(id) }
            }
        });

        if (duplicado) {
            return res.status(400).json({ mensaje: 'Ya existe otra categoría con ese nombre' });
        }

        const categoriaActualizada = await prisma.transactionCategory.update({
            where: { category_id: Number(id) },
            data: { name, description }
        });

        return res.status(200).json({
            mensaje: 'Categoría actualizada exitosamente',
            data: categoriaActualizada,
        });

    } catch (error) {
        console.error('Error al actualizar categoría de transacción:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Activar/inactivar categoría (eliminación lógica / reactivación)
const toggleCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const categoria = await prisma.transactionCategory.findUnique({
            where: { category_id: Number(id) }
        });

        if (!categoria) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }

        const statusNuevo = !categoria.is_active;

        const categoriaActualizada = await prisma.transactionCategory.update({
            where: { category_id: Number(id) },
            data: { is_active: statusNuevo }
        });

        return res.status(200).json({
            mensaje: `Categoría ${statusNuevo ? 'activada' : 'inactivada'} exitosamente`,
            data: categoriaActualizada,
        });

    } catch (error) {
        console.error('Error al cambiar de estado categoría:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

module.exports = {
    crearCategoria,
    listarCategorias,
    actualizarCategoria,
    toggleCategoria,
};
