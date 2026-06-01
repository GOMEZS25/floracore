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

// Crear Orden de Venta (legacy - sin detalles, solo cabecera)
const crearOrden = async (req, res) => {
    try {
        const { client_id, client_address_id, transaction_category_id, delivery_date, notes, document_url } = req.body;

        if (!client_id || !client_address_id || !delivery_date) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        let ordenGenerada;

        await prisma.$transaction(async (tx) => {
            const lastOrder = await tx.salesOrder.findFirst({
                orderBy: { order_number: 'desc' },
                select: { order_number: true }
            });
            const newOrderNumber = lastOrder && lastOrder.order_number ? lastOrder.order_number + 1 : 1;

            ordenGenerada = await tx.salesOrder.create({
                data: {
                    order_number: newOrderNumber,
                    client_id: BigInt(client_id),
                    client_address_id: BigInt(client_address_id),
                    transaction_category_id: transaction_category_id ? Number(transaction_category_id) : null,
                    delivery_date: new Date(delivery_date),
                    notes,
                    document_url,
                    created_by: BigInt(req.usuario.id),
                    status: 'BORRADOR'
                },
                include: { details: true }
            });
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

const listarOrdenes = async (req, res) => {
    try {
        const { client_id, status, search, delivery_date_start, delivery_date_end, page, limit } = req.query;
        const where = {};

        if (client_id) where.client_id = BigInt(client_id);
        if (status) where.status = status;

        if (search) {
            const searchAsNumber = parseInt(search);
            where.OR = [
                { client: { name: { contains: search } } },
                ...(isNaN(searchAsNumber) ? [] : [{ order_number: searchAsNumber }]),
            ];
        }

        if (delivery_date_start || delivery_date_end) {
            where.delivery_date = {};
            if (delivery_date_start) where.delivery_date.gte = new Date(delivery_date_start + 'T00:00:00');
            if (delivery_date_end) where.delivery_date.lte = new Date(delivery_date_end + 'T23:59:59');
        }

        const ordenes = await prisma.salesOrder.findMany({
            where,
            include: {
                client: { select: { client_id: true, name: true, code: true } },
                client_address: true,
                transaction_category: true,
                details: {
                    include: {
                        product: { select: { product_id: true, sku: true, name: true } },
                        lote: { select: { lote_id: true, numero_lote: true } },
                        assignments: {
                            include: { lote: { select: { lote_id: true, numero_lote: true } } }
                        }
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
                        lote: {
                            include: {
                                variant: {
                                    include: {
                                        attributes: {
                                            include: {
                                                value: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        assignments: {
                            include: {
                                lote: {
                                    select: {
                                        lote_id: true,
                                        numero_lote: true,
                                        cantidad_disponible: true,
                                        cantidad_reservada: true,
                                        unidad_medida: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { line_number: 'asc' }
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

// Aprobar orden - validar que todas las líneas con assignments tengan algo asignado
const aprobarOrden = async (req, res) => {
    try {
        const { id } = req.params;

        const orden = await prisma.salesOrder.findUnique({
            where: { order_id: BigInt(id) },
            include: {
                details: { include: { assignments: true } }
            }
        });

        if (!orden) {
            return res.status(404).json({ mensaje: 'Orden de venta no encontrada' });
        }

        if (orden.status !== 'BORRADOR') {
            return res.status(400).json({ mensaje: 'Sólo se pueden aprobar órdenes en estado BORRADOR' });
        }

        if (!orden.details || orden.details.length === 0) {
            return res.status(400).json({ mensaje: 'La orden no tiene líneas asociadas' });
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

// Despachar orden - libera reservas de assignments
const despacharOrden = async (req, res) => {
    try {
        const { id } = req.params;

        let ordenDespachada;

        await prisma.$transaction(async (tx) => {
            const orden = await tx.salesOrder.findUnique({
                where: { order_id: BigInt(id) },
                include: {
                    details: {
                        include: { assignments: true }
                    }
                }
            });

            if (!orden) throw new Error('Orden de venta no encontrada');
            if (orden.status !== 'APROBADA') throw new Error('Solo se pueden despachar órdenes en estado APROBADA');

            ordenDespachada = await tx.salesOrder.update({
                where: { order_id: BigInt(id) },
                data: { status: 'DESPACHADA' }
            });

            // Para cada detalle, procesar sus assignments
            for (const detail of orden.details) {
                for (const asgn of detail.assignments) {
                    // Decrementar reservada (disponible ya fue decrementado al asignar)
                    await tx.lote.update({
                        where: { lote_id: asgn.lote_id },
                        data: {
                            cantidad_reservada: { decrement: asgn.quantity }
                        }
                    });

                    await tx.stockMovement.create({
                        data: {
                            lote_id: asgn.lote_id,
                            movement_type: 'VENTA',
                            quantity: asgn.quantity,
                            notes: `Despacho orden #${orden.order_number}`,
                            created_by: BigInt(req.usuario.id)
                        }
                    });
                }
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

// Cancelar orden - devuelve inventario reservado
const cancelarOrden = async (req, res) => {
    try {
        const { id } = req.params;

        let ordenCancelada;

        await prisma.$transaction(async (tx) => {
            const orden = await tx.salesOrder.findUnique({
                where: { order_id: BigInt(id) },
                include: {
                    details: { include: { assignments: true } }
                }
            });

            if (!orden) throw new Error('Orden de venta no encontrada');

            if (orden.status !== 'BORRADOR' && orden.status !== 'APROBADA') {
                throw new Error('Sólo se pueden cancelar órdenes en estado BORRADOR o APROBADA');
            }

            ordenCancelada = await tx.salesOrder.update({
                where: { order_id: BigInt(id) },
                data: { status: 'CANCELADA' }
            });

            // Devolver el inventario reservado por los assignments
            for (const detail of orden.details) {
                for (const asgn of detail.assignments) {
                    await tx.lote.update({
                        where: { lote_id: asgn.lote_id },
                        data: {
                            cantidad_reservada: { decrement: asgn.quantity },
                            cantidad_disponible: { increment: asgn.quantity }
                        }
                    });

                    await tx.stockMovement.create({
                        data: {
                            lote_id: asgn.lote_id,
                            movement_type: 'CANCELACION',
                            quantity: asgn.quantity,
                            notes: `Cancelación orden #${orden.order_number}`,
                            created_by: BigInt(req.usuario.id)
                        }
                    });
                }
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

// Auto guardar orden en borrador (cabecera)
const autoGuardarOrden = async (req, res) => {
    try {
        const { client_id, client_address_id, delivery_date, transaction_category_id, notes, document_url } = req.body;

        if (!client_id || !client_address_id || !delivery_date) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        const existingDraft = await prisma.salesOrder.findFirst({
            where: {
                client_id: BigInt(client_id),
                status: 'BORRADOR',
                details: { none: {} }
            },
            include: { details: true }
        });

        if (existingDraft) {
            return res.status(200).json({
                mensaje: 'Borrador existente recuperado',
                data: serializeBigInt(existingDraft)
            });
        }

        let ordenGenerada;

        await prisma.$transaction(async (tx) => {
            const lastOrder = await tx.salesOrder.findFirst({
                orderBy: { order_number: 'desc' },
                select: { order_number: true }
            });
            const newOrderNumber = lastOrder && lastOrder.order_number ? lastOrder.order_number + 1 : 1;

            ordenGenerada = await tx.salesOrder.create({
                data: {
                    order_number: newOrderNumber,
                    client_id: BigInt(client_id),
                    client_address_id: BigInt(client_address_id),
                    transaction_category_id: transaction_category_id ? Number(transaction_category_id) : null,
                    delivery_date: new Date(delivery_date),
                    notes,
                    document_url,
                    created_by: BigInt(req.usuario.id),
                    status: 'BORRADOR'
                },
                include: { details: true }
            });
        });

        return res.status(201).json({
            mensaje: 'Orden borrador creada',
            data: serializeBigInt(ordenGenerada)
        });
    } catch (error) {
        console.error('Error al auto guardar orden:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Agregar línea a orden
// Modo LOTE: requiere lote_id → crea detalle + assignment + afecta inventario
// Modo PRODUCTO: lote_id = null → solo crea detalle, sin tocar inventario
const agregarLinea = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            lote_id,           // null si modo PRODUCTO
            product_id,
            packaging_type,
            quantity,
            tallos_por_ramo,
            ramos_por_caja,
            unit_price,
            billing_unit,
            notes
        } = req.body;

        if (!product_id || !packaging_type || !quantity || unit_price === undefined || !billing_unit) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        let total_stems = 0;
        let total_bunches = null;
        let total_boxes = null;

        const qty = Number(quantity);
        const tpr = tallos_por_ramo ? Number(tallos_por_ramo) : 0;
        const rpc = ramos_por_caja ? Number(ramos_por_caja) : 0;

        if (packaging_type === 'TALLO') {
            total_stems = qty;
        } else if (packaging_type === 'RAMO') {
            total_stems = qty * tpr;
            total_bunches = qty;
        } else if (packaging_type === 'CAJA') {
            total_stems = qty * rpc * tpr;
            total_bunches = qty * rpc;
            total_boxes = qty;
        }

        let subtotal = 0;
        const price = Number(unit_price);
        if (billing_unit === 'TALLO') {
            subtotal = total_stems * price;
        } else if (billing_unit === 'RAMO') {
            subtotal = (total_bunches || 0) * price;
        } else if (billing_unit === 'CAJA') {
            subtotal = (total_boxes || 0) * price;
        }

        const stems_per_bunch = tpr || null;
        const bunches_per_box = rpc || null;

        let nuevoDetalle;

        await prisma.$transaction(async (tx) => {
            const orden = await tx.salesOrder.findUnique({
                where: { order_id: BigInt(id) },
                include: { details: true }
            });

            if (!orden) throw new Error('Orden de venta no encontrada');
            if (orden.status !== 'BORRADOR') throw new Error('Sólo se pueden agregar líneas a órdenes en estado BORRADOR');

            const currentLineCount = orden.details.length;

            // Crear el detalle (lote_id puede ser null si modo producto)
            nuevoDetalle = await tx.salesOrderDetail.create({
                data: {
                    order_id: BigInt(id),
                    lote_id: lote_id ? BigInt(lote_id) : null,
                    product_id: BigInt(product_id),
                    line_number: currentLineCount + 1,
                    packaging_type,
                    quantity: qty,
                    stems_per_bunch,
                    bunches_per_box,
                    total_stems,
                    total_bunches,
                    total_boxes,
                    unit_price: price,
                    subtotal,
                    notes
                }
            });

            // Si se proporcionó un lote → modo LOTE: crear assignment y afectar inventario
            if (lote_id) {
                const lote = await tx.lote.findUnique({ where: { lote_id: BigInt(lote_id) } });
                if (!lote) throw new Error('Lote no encontrado');

                if (Number(lote.cantidad_disponible) < total_stems) {
                    const err = new Error('Inventario insuficiente');
                    err.status = 400;
                    err.data = {
                        disponible: Number(lote.cantidad_disponible),
                        necesario: total_stems
                    };
                    throw err;
                }

                // Crear assignment
                await tx.salesOrderAssignment.create({
                    data: {
                        detail_id: nuevoDetalle.detail_id,
                        lote_id: BigInt(lote_id),
                        quantity: total_stems
                    }
                });

                // Afectar inventario
                await tx.lote.update({
                    where: { lote_id: BigInt(lote_id) },
                    data: {
                        cantidad_disponible: { decrement: total_stems },
                        cantidad_reservada: { increment: total_stems }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        lote_id: BigInt(lote_id),
                        movement_type: 'RESERVA',
                        quantity: total_stems,
                        notes: `Reserva línea orden #${orden.order_number}`,
                        created_by: BigInt(req.usuario.id)
                    }
                });
            }
        });

        return res.status(201).json({
            mensaje: 'Línea agregada exitosamente',
            data: serializeBigInt(nuevoDetalle)
        });

    } catch (error) {
        console.error('Error al agregar línea:', error.message);
        if (error.status === 400) {
            return res.status(400).json({ mensaje: error.message, ...error.data });
        }
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Eliminar línea - libera todos sus assignments
const eliminarLinea = async (req, res) => {
    try {
        const { detail_id } = req.params;

        let total_stems_liberados = 0;

        await prisma.$transaction(async (tx) => {
            const detail = await tx.salesOrderDetail.findUnique({
                where: { detail_id: BigInt(detail_id) },
                include: {
                    order: true,
                    assignments: true
                }
            });

            if (!detail) throw new Error('Línea no encontrada');

            const orden = detail.order;
            if (orden.status !== 'BORRADOR') {
                throw new Error('No se pueden eliminar líneas de órdenes que no están en BORRADOR');
            }

            // Liberar inventario de cada assignment
            for (const asgn of detail.assignments) {
                total_stems_liberados += asgn.quantity;

                await tx.lote.update({
                    where: { lote_id: asgn.lote_id },
                    data: {
                        cantidad_disponible: { increment: asgn.quantity },
                        cantidad_reservada: { decrement: asgn.quantity }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        lote_id: asgn.lote_id,
                        movement_type: 'CANCELACION',
                        quantity: asgn.quantity,
                        notes: `Línea eliminada de orden #${orden.order_number}`,
                        created_by: BigInt(req.usuario.id)
                    }
                });
            }

            // Eliminar detalle (assignments se borran en cascade)
            await tx.salesOrderDetail.delete({
                where: { detail_id: BigInt(detail_id) }
            });
        });

        return res.status(200).json({
            mensaje: 'Línea eliminada',
            tallos_liberados: total_stems_liberados
        });

    } catch (error) {
        console.error('Error al eliminar línea:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Asignar inventario a una línea (modal de asignación)
// Body: { assignments: [{ lote_id, quantity }] }
// quantity está en la unidad de venta de la línea (total_stems)
const asignarInventario = async (req, res) => {
    try {
        const { detail_id } = req.params;
        const { assignments } = req.body; // [{ lote_id, quantity }]

        if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ mensaje: 'Debe proporcionar al menos una asignación' });
        }

        let resultado;

        await prisma.$transaction(async (tx) => {
            const detail = await tx.salesOrderDetail.findUnique({
                where: { detail_id: BigInt(detail_id) },
                include: {
                    order: true,
                    assignments: true
                }
            });

            if (!detail) throw new Error('Línea no encontrada');
            if (detail.order.status !== 'BORRADOR') {
                throw new Error('Solo se puede asignar inventario en órdenes en BORRADOR');
            }

            // Calcular total ya asignado
            const yaAsignado = detail.assignments.reduce((sum, a) => sum + a.quantity, 0);

            // Calcular total de las nuevas asignaciones
            const nuevasCantidad = assignments.reduce((sum, a) => sum + Number(a.quantity), 0);

            if (yaAsignado + nuevasCantidad > detail.total_stems) {
                throw Object.assign(
                    new Error(`La suma de asignaciones (${yaAsignado + nuevasCantidad}) supera el total de la línea (${detail.total_stems})`),
                    { status: 400 }
                );
            }

            // Procesar cada asignación
            for (const asgn of assignments) {
                const qty = Number(asgn.quantity);
                const loteId = BigInt(asgn.lote_id);

                const lote = await tx.lote.findUnique({ where: { lote_id: loteId } });
                if (!lote) throw new Error(`Lote ${asgn.lote_id} no encontrado`);

                if (Number(lote.cantidad_disponible) < qty) {
                    throw Object.assign(
                        new Error(`Lote ${lote.numero_lote}: disponible ${lote.cantidad_disponible}, solicitado ${qty}`),
                        { status: 400 }
                    );
                }

                // Crear assignment
                await tx.salesOrderAssignment.create({
                    data: {
                        detail_id: BigInt(detail_id),
                        lote_id: loteId,
                        quantity: qty
                    }
                });

                // Afectar inventario
                await tx.lote.update({
                    where: { lote_id: loteId },
                    data: {
                        cantidad_disponible: { decrement: qty },
                        cantidad_reservada: { increment: qty }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        lote_id: loteId,
                        movement_type: 'RESERVA',
                        quantity: qty,
                        notes: `Asignación línea #${detail.line_number} orden #${detail.order.order_number}`,
                        created_by: BigInt(req.usuario.id)
                    }
                });
            }

            resultado = await tx.salesOrderDetail.findUnique({
                where: { detail_id: BigInt(detail_id) },
                include: {
                    assignments: {
                        include: { lote: { select: { lote_id: true, numero_lote: true } } }
                    }
                }
            });
        });

        return res.status(200).json({
            mensaje: 'Inventario asignado exitosamente',
            data: serializeBigInt(resultado)
        });

    } catch (error) {
        console.error('Error al asignar inventario:', error.message);
        if (error.status === 400) {
            return res.status(400).json({ mensaje: error.message });
        }
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

// Liberar una asignación específica
const liberarAsignacion = async (req, res) => {
    try {
        const { assignment_id } = req.params;

        await prisma.$transaction(async (tx) => {
            const asgn = await tx.salesOrderAssignment.findUnique({
                where: { assignment_id: BigInt(assignment_id) },
                include: {
                    detail: { include: { order: true } }
                }
            });

            if (!asgn) throw new Error('Asignación no encontrada');
            if (asgn.detail.order.status !== 'BORRADOR') {
                throw Object.assign(new Error('Solo se pueden liberar asignaciones en órdenes BORRADOR'), { status: 400 });
            }

            await tx.salesOrderAssignment.delete({
                where: { assignment_id: BigInt(assignment_id) }
            });

            await tx.lote.update({
                where: { lote_id: asgn.lote_id },
                data: {
                    cantidad_reservada: { decrement: asgn.quantity },
                    cantidad_disponible: { increment: asgn.quantity }
                }
            });

            await tx.stockMovement.create({
                data: {
                    lote_id: asgn.lote_id,
                    movement_type: 'CANCELACION',
                    quantity: asgn.quantity,
                    notes: `Asignación liberada, orden #${asgn.detail.order.order_number}`,
                    created_by: BigInt(req.usuario.id)
                }
            });
        });

        return res.status(200).json({ mensaje: 'Asignación liberada exitosamente' });

    } catch (error) {
        console.error('Error al liberar asignación:', error.message);
        if (error.status === 400) {
            return res.status(400).json({ mensaje: error.message });
        }
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};

const updateOrderHeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id, client_address_id, delivery_date, transaction_category_id, notes } = req.body;

        const orden = await prisma.salesOrder.findUnique({
            where: { order_id: BigInt(id) }
        });

        if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' });
        if (orden.status === 'DESPACHADA' || orden.status === 'CANCELADA') {
            return res.status(400).json({ mensaje: 'No se puede editar una orden finalizada' });
        }

        const updated = await prisma.salesOrder.update({
            where: { order_id: BigInt(id) },
            data: {
                client_id: client_id ? BigInt(client_id) : orden.client_id,
                client_address_id: client_address_id ? BigInt(client_address_id) : orden.client_address_id,
                delivery_date: delivery_date ? new Date(delivery_date) : orden.delivery_date,
                transaction_category_id: transaction_category_id !== undefined ? (transaction_category_id ? BigInt(transaction_category_id) : null) : orden.transaction_category_id,
                notes: notes !== undefined ? notes : orden.notes
            }
        });

        return res.status(200).json({ data: serializeBigInt(updated) });
    } catch (error) {
        console.error('Error al actualizar cabecera:', error.message);
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
    autoGuardarOrden,
    agregarLinea,
    eliminarLinea,
    asignarInventario,
    liberarAsignacion,
    updateOrderHeader
};
