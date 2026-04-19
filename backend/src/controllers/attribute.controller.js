const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

// ─── Crear atributo ────────────────────────────────────────────────────────────
const crearAtributo = async (req, res) => {
    try {
        const { name } = req.body;
        const { id: userId } = req.usuario;

        if (!name || !name.trim()) {
            return res.status(400).json({ mensaje: 'El campo name es obligatorio' });
        }

        const existe = await prisma.attribute.findUnique({ where: { name: name.trim() } });
        if (existe) {
            return res.status(400).json({ mensaje: 'Ya existe un atributo con ese nombre' });
        }

        const atributo = await prisma.attribute.create({
            data: {
                name: name.trim(),
                created_by: BigInt(userId),
            },
            select: {
                attribute_id: true,
                name: true,
                order: true,
                is_active: true,
                created_by: true,
                created_at: true,
                values: {
                    select: { value_id: true, value: true, is_active: true, created_at: true },
                },
            },
        });

        res.status(201).json({
            mensaje: 'Atributo creado correctamente',
            data: serializeBigInt(atributo),
        });
    } catch (error) {
        console.error('Error al crear atributo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

//Listar atributos
const listarAtributos = async (req, res) => {
    try {
        const { name, is_active } = req.query;

        const where = {};
        if (name) where.name = { contains: name };
        if (is_active !== undefined && is_active !== '') {
            where.is_active = is_active === 'true';
        }

        const atributos = await prisma.attribute.findMany({
            where,
            select: {
                attribute_id: true,
                name: true,
                order: true,
                is_active: true,
                created_by: true,
                created_at: true,
                values: {
                    select: { value_id: true, value: true, is_active: true, created_at: true },
                    orderBy: { value: 'asc' },
                },
            },
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });

        res.status(200).json(atributos.map(serializeBigInt));
    } catch (error) {
        console.error('Error al listar atributos:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Actualizar atributo 
const actualizarAtributo = async (req, res) => {
    try {
        const { id } = req.params;
        const attributeId = BigInt(id);
        const { name, order } = req.body;

        // Al menos uno de los dos campos debe venir
        if (name === undefined && order === undefined) {
            return res.status(400).json({ mensaje: 'Debe enviar al menos name u order' });
        }

        const atributo = await prisma.attribute.findUnique({ where: { attribute_id: attributeId } });
        if (!atributo) {
            return res.status(404).json({ mensaje: 'Atributo no encontrado' });
        }

        const dataToUpdate = {};

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ mensaje: 'El campo name no puede estar vacío' });
            }
            const duplicado = await prisma.attribute.findFirst({
                where: { name: name.trim(), NOT: { attribute_id: attributeId } },
            });
            if (duplicado) {
                return res.status(400).json({ mensaje: 'Ya existe un atributo con ese nombre' });
            }
            dataToUpdate.name = name.trim();
        }

        if (order !== undefined) {
            const parsedOrder = parseInt(order, 10);
            if (isNaN(parsedOrder)) {
                return res.status(400).json({ mensaje: 'El campo order debe ser un número entero' });
            }
            dataToUpdate.order = parsedOrder;
        }

        const actualizado = await prisma.attribute.update({
            where: { attribute_id: attributeId },
            data: dataToUpdate,
            select: {
                attribute_id: true,
                name: true,
                order: true,
                is_active: true,
                created_by: true,
                created_at: true,
                values: {
                    select: { value_id: true, value: true, is_active: true, created_at: true },
                    orderBy: { value: 'asc' },
                },
            },
        });

        res.status(200).json({
            mensaje: 'Atributo actualizado correctamente',
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al actualizar atributo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Toggle atributo ───────────────────────────────────────────────────────────
const toggleAtributo = async (req, res) => {
    try {
        const { id } = req.params;
        const attributeId = BigInt(id);

        const atributo = await prisma.attribute.findUnique({ where: { attribute_id: attributeId } });
        if (!atributo) {
            return res.status(404).json({ mensaje: 'Atributo no encontrado' });
        }

        const actualizado = await prisma.attribute.update({
            where: { attribute_id: attributeId },
            data: { is_active: !atributo.is_active },
            select: {
                attribute_id: true,
                name: true,
                is_active: true,
                created_by: true,
                created_at: true,
            },
        });

        const estado = actualizado.is_active ? 'activado' : 'desactivado';
        res.status(200).json({
            mensaje: `Atributo ${estado} correctamente`,
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al cambiar estado de atributo:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Agregar valor a un atributo ───────────────────────────────────────────────
const agregarValor = async (req, res) => {
    try {
        const { id } = req.params;
        const attributeId = BigInt(id);
        const { value } = req.body;

        if (!value || !value.trim()) {
            return res.status(400).json({ mensaje: 'El campo value es obligatorio' });
        }

        const atributo = await prisma.attribute.findUnique({ where: { attribute_id: attributeId } });
        if (!atributo) {
            return res.status(404).json({ mensaje: 'Atributo no encontrado' });
        }

        const duplicado = await prisma.attributeValue.findFirst({
            where: { attribute_id: attributeId, value: value.trim() },
        });
        if (duplicado) {
            return res.status(400).json({ mensaje: 'Ya existe ese valor en este atributo' });
        }

        const nuevoValor = await prisma.attributeValue.create({
            data: { attribute_id: attributeId, value: value.trim() },
            select: { value_id: true, attribute_id: true, value: true, is_active: true, created_at: true },
        });

        res.status(201).json({
            mensaje: 'Valor agregado correctamente',
            data: serializeBigInt(nuevoValor),
        });
    } catch (error) {
        console.error('Error al agregar valor:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Listar valores de un atributo ─────────────────────────────────────────────
const listarValores = async (req, res) => {
    try {
        const { id } = req.params;
        const attributeId = BigInt(id);

        const atributo = await prisma.attribute.findUnique({ where: { attribute_id: attributeId } });
        if (!atributo) {
            return res.status(404).json({ mensaje: 'Atributo no encontrado' });
        }

        const valores = await prisma.attributeValue.findMany({
            where: { attribute_id: attributeId },
            select: { value_id: true, attribute_id: true, value: true, is_active: true, created_at: true },
            orderBy: { value: 'asc' },
        });

        res.status(200).json(valores.map(serializeBigInt));
    } catch (error) {
        console.error('Error al listar valores:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Toggle valor ──────────────────────────────────────────────────────────────
const toggleValor = async (req, res) => {
    try {
        const { id, valueId } = req.params;
        const attributeId = BigInt(id);
        const valueIdBigInt = BigInt(valueId);

        const valor = await prisma.attributeValue.findFirst({
            where: { value_id: valueIdBigInt, attribute_id: attributeId },
        });
        if (!valor) {
            return res.status(404).json({ mensaje: 'Valor no encontrado para este atributo' });
        }

        const actualizado = await prisma.attributeValue.update({
            where: { value_id: valueIdBigInt },
            data: { is_active: !valor.is_active },
            select: { value_id: true, attribute_id: true, value: true, is_active: true, created_at: true },
        });

        const estado = actualizado.is_active ? 'activado' : 'desactivado';
        res.status(200).json({
            mensaje: `Valor ${estado} correctamente`,
            data: serializeBigInt(actualizado),
        });
    } catch (error) {
        console.error('Error al cambiar estado de valor:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// ─── Eliminar valor ────────────────────────────────────────────────────────────
const eliminarValor = async (req, res) => {
    try {
        const { id, valueId } = req.params;
        const attributeId = BigInt(id);
        const valueIdBigInt = BigInt(valueId);

        const valor = await prisma.attributeValue.findFirst({
            where: { value_id: valueIdBigInt, attribute_id: attributeId },
        });
        if (!valor) {
            return res.status(404).json({ mensaje: 'Valor no encontrado para este atributo' });
        }

        const enUso = await prisma.productVariantAttribute.findFirst({
            where: { value_id: valueIdBigInt },
        });
        if (enUso) {
            return res.status(400).json({
                mensaje: 'No se puede eliminar el valor porque está asociado a una o más variantes de producto',
            });
        }

        await prisma.attributeValue.delete({ where: { value_id: valueIdBigInt } });

        res.status(200).json({ mensaje: 'Valor eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar valor:', error.message);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

module.exports = {
    crearAtributo,
    listarAtributos,
    actualizarAtributo,
    toggleAtributo,
    agregarValor,
    listarValores,
    toggleValor,
    eliminarValor,
};
