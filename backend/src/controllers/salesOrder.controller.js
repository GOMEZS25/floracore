const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');

// Obtener siguiente número de orden
const getNextOrderNumber = async (req, res) => {
  try {
    const lastOrder = await prisma.salesOrder.findFirst({
      orderBy: { order_number: 'desc' },
      select: { order_number: true }
    });
    const nextNumber = lastOrder ? lastOrder.order_number + 1 : 1;
    return res.status(200).json({ data: { order_number: nextNumber } });
  } catch (error) {
    console.error('Error al obtener siguiente número de orden:', error.message);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Crear Orden de Venta
const crearOrden = async (req, res) => {
    try {
        const { client_id, client_address_id, transaction_category_id, delivery_date, notes, document_url, details } = req.body;

        // Validaciones básicas
        if (!client_id || !client_address_id || !delivery_date || !details || !Array.isArray(details)) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        let ordenGenerada;

        await prisma.$transaction(async (tx) => {
            // 1. Generar order_number (buscar el último y sumar 1)
            const lastOrder = await tx.salesOrder.findFirst({
                orderBy: { order_number: 'desc' },
                select: { order_number: true }
            });
            const newOrderNumber = lastOrder && lastOrder.order_number ? lastOrder.order_number + 1 : 1;

            // 2. Validar disponibilidad en lotes
            for (const item of details) {
                const lote = await tx.lote.findUnique({
                    where: { lote_id: BigInt(item.lote_id) }
                });

                if (!lote) {
                    throw new Error(`El lote con ID ${item.lote_id} no existe`);
                }

                if (Number(lote.cantidad_disponible) < Number(item.quantity)) {
                    throw new Error(`El lote ${lote.numero_lote} no tiene suficiente cantidad disponible. Solicitado: ${item.quantity}, Disponible: ${lote.cantidad_disponible}`);
                }
            }

            // 3. Crear cabecera y detalles en la orden
            const orden = await tx.salesOrder.create({
                data: {
                    order_number: newOrderNumber,
                    client_id: BigInt(client_id),
                    client_address_id: BigInt(client_address_id),
                    transaction_category_id: transaction_category_id ? Number(transaction_category_id) : null,
                    delivery_date: new Date(delivery_date),
                    notes,
                    document_url,
                    created_by: BigInt(req.usuario.id),
                    status: 'BORRADOR',
                    details: {
                        create: details.map((d, index) => ({
                            lote_id: BigInt(d.lote_id),
                            product_id: BigInt(d.product_id),
                            line_number: index + 1,
                            packaging_type: d.packaging_type,
                            quantity: Number(d.quantity),
                            stems_per_bunch: d.stems_per_bunch ? Number(d.stems_per_bunch) : null,
                            bunches_per_box: d.bunches_per_box ? Number(d.bunches_per_box) : null,
                            total_stems: Number(d.total_stems),
                            total_bunches: d.total_bunches ? Number(d.total_bunches) : null,
                            total_boxes: d.total_boxes ? Number(d.total_boxes) : null,
                            unit_price: Number(d.unit_price),
                            subtotal: Number(d.subtotal),
                            notes: d.notes
                        }))
                    }
                },
                include: {
                    details: true
                }
            });

            // 4. Actualizar inventario de Lotes (descontar de disponible y pasar a reservada)
            for (const item of details) {
                await tx.lote.update({
                    where: { lote_id: BigInt(item.lote_id) },
                    data: {
                        cantidad_disponible: { decrement: Number(item.quantity) },
                        cantidad_reservada: { increment: Number(item.quantity) }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        lote_id: BigInt(item.lote_id),
                        movement_type: 'RESERVA',
                        quantity: Number(item.quantity),
                        notes: `Reserva por orden #${newOrderNumber}`,
                        created_by: BigInt(req.usuario.id)
                    }
                });
            }

            ordenGenerada = orden;
        });

        return res.status(201).json({
            mensaje: 'Orden de venta creada exitosamente',
            data: serializeBigInt(ordenGenerada),
        });

    } catch (error) {
        console.error('Error al crear orden de venta:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Listar órdenes de venta
const listarOrdenes = async (req, res) => {
    try {
        const { client_id, status, delivery_date } = req.query;
        const where = {};

        if (client_id) where.client_id = BigInt(client_id);
        if (status) where.status = status;
        if (delivery_date) where.delivery_date = new Date(delivery_date);

        const ordenes = await prisma.salesOrder.findMany({
            where,
            include: {
                client: { select: { client_id: true, name: true, code: true } },
                client_address: true,
                transaction_category: true,
                details: {
                    include: {
                        product: { select: { product_id: true, sku: true, name: true } },
                        lote: { select: { lote_id: true, numero_lote: true } }
                    }
                }
            },
            orderBy: { order_number: 'desc' }
        });

        return res.status(200).json({
            mensaje: 'Órdenes de venta listadas exitosamente',
            data: ordenes.map(serializeBigInt),
        });

    } catch (error) {
        console.error('Error al listar órdenes de venta:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Obtener orden por ID
const obtenerOrden = async (req, res) => {
    try {
        const { id } = req.params;

        const orden = await prisma.salesOrder.findUnique({
            where: { order_id: BigInt(id) },
            include: {
                client: true,
                client_address: true,
                transaction_category: true,
                details: {
                    include: {
                        product: true,
                        lote: true
                    }
                }
            }
        });

        if (!orden) {
            return res.status(404).json({ mensaje: 'Orden de venta no encontrada' });
        }

        return res.status(200).json({
            mensaje: 'Orden obtenida exitosamente',
            data: serializeBigInt(orden),
        });

    } catch (error) {
        console.error('Error al obtener orden de venta:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Aprobar orden
const aprobarOrden = async (req, res) => {
    try {
        const { id } = req.params;

        const orden = await prisma.salesOrder.findUnique({
            where: { order_id: BigInt(id) },
            include: { details: true }
        });

        if (!orden) {
            return res.status(404).json({ mensaje: 'Orden de venta no encontrada' });
        }

        if (orden.status !== 'BORRADOR') {
            return res.status(400).json({ mensaje: 'Sólo se pueden aprobar órdenes en estado BORRADOR' });
        }

        if (!orden.details || orden.details.length === 0) {
            return res.status(400).json({ mensaje: 'La orden no tiene detalles asociados, no se puede aprobar' });
        }

        const ordenAprobada = await prisma.salesOrder.update({
            where: { order_id: BigInt(id) },
            data: { status: 'APROBADA' }
        });

        return res.status(200).json({
            mensaje: 'Orden aprobada exitosamente',
            data: serializeBigInt(ordenAprobada),
        });

    } catch (error) {
        console.error('Error al aprobar orden de venta:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Despachar orden
const despacharOrden = async (req, res) => {
    try {
        const { id } = req.params;

        let ordenDespachada;

        await prisma.$transaction(async (tx) => {
            const orden = await tx.salesOrder.findUnique({
                where: { order_id: BigInt(id) },
                include: { details: true }
            });

            if (!orden) {
                throw new Error('Orden de venta no encontrada');
            }

            if (orden.status !== 'APROBADA') {
                throw new Error('Solo se pueden despachar órdenes en estado APROBADA');
            }

            // 1. Cambiar estado a DESPACHADA
            ordenDespachada = await tx.salesOrder.update({
                where: { order_id: BigInt(id) },
                data: { status: 'DESPACHADA' }
            });

            // 2. Descontar la cantidad_reservada en los Lotes definitivamente
            for (const item of orden.details) {
                await tx.lote.update({
                    where: { lote_id: BigInt(item.lote_id) },
                    data: {
                        cantidad_reservada: { decrement: Number(item.quantity) }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        lote_id: BigInt(item.lote_id),
                        movement_type: 'VENTA',
                        quantity: Number(item.quantity),
                        notes: `Despacho por orden #${orden.order_number}`,
                        created_by: BigInt(req.usuario.id)
                    }
                });
            }
        });

        return res.status(200).json({
            mensaje: 'Orden despachada exitosamente',
            data: serializeBigInt(ordenDespachada),
        });

    } catch (error) {
        console.error('Error al despachar orden de venta:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Cancelar orden
const cancelarOrden = async (req, res) => {
    try {
        const { id } = req.params;

        let ordenCancelada;

        await prisma.$transaction(async (tx) => {
            const orden = await tx.salesOrder.findUnique({
                where: { order_id: BigInt(id) },
                include: { details: true }
            });

            if (!orden) {
                throw new Error('Orden de venta no encontrada');
            }

            if (orden.status !== 'BORRADOR' && orden.status !== 'APROBADA') {
                throw new Error('Sólo se pueden cancelar órdenes en estado BORRADOR o APROBADA');
            }

            // 1. Cambiar estado a CANCELADA
            ordenCancelada = await tx.salesOrder.update({
                where: { order_id: BigInt(id) },
                data: { status: 'CANCELADA' }
            });

            // 2. Devolver cantidad reservada a cantidad disponible
            for (const item of orden.details) {
                await tx.lote.update({
                    where: { lote_id: BigInt(item.lote_id) },
                    data: {
                        cantidad_reservada: { decrement: Number(item.quantity) },
                        cantidad_disponible: { increment: Number(item.quantity) }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        lote_id: BigInt(item.lote_id),
                        movement_type: 'CANCELACION',
                        quantity: Number(item.quantity),
                        notes: `Cancelación de orden #${orden.order_number}`,
                        created_by: BigInt(req.usuario.id)
                    }
                });
            }
        });

        return res.status(200).json({
            mensaje: 'Orden cancelada exitosamente',
            data: serializeBigInt(ordenCancelada),
        });

    } catch (error) {
        console.error('Error al cancelar orden de venta:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

module.exports = {
    getNextOrderNumber,
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    aprobarOrden,
    despacharOrden,
    cancelarOrden,
};
