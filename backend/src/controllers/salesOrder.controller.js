const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');
const { validateUpc } = require('../utils/gtin');

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

// Crear Orden de Venta (Header)
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
                    delivery_date: new Date(delivery_date + 'T00:00:00.000Z'),
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
            if (delivery_date_start) where.delivery_date.gte = new Date(delivery_date_start + 'T00:00:00.000Z');
            if (delivery_date_end) where.delivery_date.lte = new Date(delivery_date_end + 'T23:59:59.000Z');
        }

        const pageNum = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 25;

        const [ordenes, total] = await Promise.all([
            prisma.salesOrder.findMany({
                where,
                include: {
                    client: { select: { client_id: true, name: true, code: true, currency: true } },
                    client_address: true,
                    transaction_category: true,
                    details: {
                        include: {
                            product: { select: { product_id: true, sku: true, name: true } },
                            variant: { include: { attributes: { include: { value: true } } } },
                            lote: { select: { lote_id: true, numero_lote: true } },
                            assignments: {
                                include: { lote: { select: { lote_id: true, numero_lote: true } } }
                            }
                        }
                    }
                },
                orderBy: { order_number: 'desc' },
                skip: (pageNum - 1) * pageSize,
                take: pageSize,
            }),
            prisma.salesOrder.count({ where }),
        ]);

        return res.status(200).json({
            mensaje: 'Órdenes de venta listadas exitosamente',
            data: ordenes.map(serializeBigInt),
            total,
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
                        variant: {
                            include: {
                                attributes: {
                                    include: {
                                        value: true
                                    }
                                }
                            }
                        },
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

// Transiciones de estado válidas para órdenes de venta.
const ALLOWED_ORDER_TRANSITIONS = {
    BORRADOR: ['CONFIRMADA', 'CANCELADA'],
    CONFIRMADA: ['BORRADOR', 'DESPACHADA', 'CANCELADA'],
    DESPACHADA: ['CANCELADA'],
    CANCELADA: []
};

// Cambiar estado de una orden - endpoint único para todas las transiciones
const cambiarEstadoOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: nuevoEstado } = req.body;

        if (!nuevoEstado) {
            return res.status(400).json({ mensaje: 'El nuevo estado es obligatorio' });
        }

        const orden = await prisma.salesOrder.findUnique({
            where: { order_id: BigInt(id) },
            include: { details: { include: { assignments: true } } }
        });

        if (!orden) {
            return res.status(404).json({ mensaje: 'Orden de venta no encontrada' });
        }

        const estadoActual = orden.status;
        const permitidos = ALLOWED_ORDER_TRANSITIONS[estadoActual] || [];

        if (!permitidos.includes(nuevoEstado)) {
            return res.status(400).json({
                mensaje: `No se puede pasar de ${estadoActual} a ${nuevoEstado}`
            });
        }

        if (nuevoEstado === 'CONFIRMADA' && (!orden.details || orden.details.length === 0)) {
            return res.status(400).json({ mensaje: 'La orden no tiene líneas asociadas' });
        }

        let ordenActualizada;

        await prisma.$transaction(async (tx) => {
            ordenActualizada = await tx.salesOrder.update({
                where: { order_id: BigInt(id) },
                data: { status: nuevoEstado }
            });

            // CONFIRMADA -> DESPACHADA: descuenta reservada (disponible ya se descontó al asignar)
            if (estadoActual === 'CONFIRMADA' && nuevoEstado === 'DESPACHADA') {
                for (const detail of orden.details) {
                    for (const asgn of detail.assignments) {
                        await tx.lote.update({
                            where: { lote_id: asgn.lote_id },
                            data: { cantidad_reservada: { decrement: asgn.quantity } }
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
            }

            // BORRADOR|CONFIRMADA -> CANCELADA: la reserva seguía activa, se libera por completo
            if ((estadoActual === 'BORRADOR' || estadoActual === 'CONFIRMADA') && nuevoEstado === 'CANCELADA') {
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
            }

            // DESPACHADA -> CANCELADA: la reservada ya se había descontado al despachar,
            // solo se devuelve a disponible (equivale a revertir la venta).
            // TODO: restrict to users with a specific permission
            if (estadoActual === 'DESPACHADA' && nuevoEstado === 'CANCELADA') {
                for (const detail of orden.details) {
                    for (const asgn of detail.assignments) {
                        await tx.lote.update({
                            where: { lote_id: asgn.lote_id },
                            data: { cantidad_disponible: { increment: asgn.quantity } }
                        });

                        await tx.stockMovement.create({
                            data: {
                                lote_id: asgn.lote_id,
                                movement_type: 'CANCELACION',
                                quantity: asgn.quantity,
                                notes: `Cancelación de orden despachada #${orden.order_number}`,
                                created_by: BigInt(req.usuario.id)
                            }
                        });
                    }
                }
            }

            // CONFIRMADA -> BORRADOR: solo cambia el status, no afecta inventario ni assignments
        });

        return res.status(200).json({
            mensaje: 'Estado de la orden actualizado exitosamente',
            data: serializeBigInt(ordenActualizada),
        });

    } catch (error) {
        console.error('Error al cambiar estado de la orden de venta:', error.message);
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
                    delivery_date: new Date(delivery_date + 'T00:00:00.000Z'),
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
// Modo LOTE: requiere lote_id, crea detalle + assignment, afecta inventario
// Modo PRODUCTO: lote_id = null, solo crea detalle, sin tocar inventario
const agregarLinea = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            lote_id,           // null si modo PRODUCTO
            product_id,
            variant_id,
            packaging_type,
            quantity,
            tallos_por_ramo,
            ramos_por_caja,
            unit_price,
            billing_unit,
            notes,
            upc,
            mark_code
        } = req.body;

        if (!product_id || !packaging_type || !quantity || unit_price === undefined || !billing_unit) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        const upcResult = validateUpc(upc);
        if (upcResult.error) {
            return res.status(400).json({ mensaje: upcResult.error });
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
                    variant_id: variant_id ? BigInt(variant_id) : null,
                    line_number: currentLineCount + 1,
                    packaging_type,
                    quantity: qty,
                    stems_per_bunch,
                    bunches_per_box,
                    total_stems,
                    total_bunches,
                    total_boxes,
                    billing_unit,
                    unit_price: price,
                    subtotal,
                    notes,
                    upc: upcResult.value,
                    mark_code
                }
            });

            // Si se proporcionó un lote, |Modo LOTE: crear assignment y afectar inventario
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

// Actualizar línea - solo permitido si no tiene inventario reservado
const actualizarLinea = async (req, res) => {
    try {
        const { detail_id } = req.params;
        const {
            packaging_type,
            quantity,
            tallos_por_ramo,
            ramos_por_caja,
            unit_price,
            billing_unit,
            upc,
            mark_code,
            notes
        } = req.body;

        if (!packaging_type || !quantity || unit_price === undefined || !billing_unit) {
            return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
        }

        let upcValue;
        if (upc !== undefined) {
            const upcResult = validateUpc(upc);
            if (upcResult.error) {
                return res.status(400).json({ mensaje: upcResult.error });
            }
            upcValue = upcResult.value;
        }

        const detalle = await prisma.salesOrderDetail.findUnique({
            where: { detail_id: BigInt(detail_id) },
            include: { order: true, assignments: true }
        });

        if (!detalle) {
            return res.status(404).json({ mensaje: 'Línea no encontrada' });
        }

        if (!['BORRADOR', 'CONFIRMADA'].includes(detalle.order.status)) {
            return res.status(400).json({ mensaje: 'Solo se pueden editar líneas de órdenes en Borrador o Confirmadas' });
        }

        if (detalle.assignments.length > 0) {
            return res.status(400).json({ mensaje: 'Esta línea tiene inventario reservado. Quita la reserva antes de editarla.' });
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

        const data = {
            packaging_type,
            quantity: qty,
            stems_per_bunch,
            bunches_per_box,
            total_stems,
            total_bunches,
            total_boxes,
            billing_unit,
            unit_price: price,
            subtotal
        };

        // Only touch these optional columns when the client sends them, so an
        // update that omits them leaves the stored value untouched.
        if (upc !== undefined) data.upc = upcValue;
        if (mark_code !== undefined) data.mark_code = mark_code;
        if (notes !== undefined) data.notes = notes;

        const actualizado = await prisma.salesOrderDetail.update({
            where: { detail_id: BigInt(detail_id) },
            data
        });

        return res.status(200).json({
            mensaje: 'Línea actualizada exitosamente',
            data: serializeBigInt(actualizado)
        });

    } catch (error) {
        console.error('Error al actualizar línea:', error.message);
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
        if (orden.status === 'CANCELADA') {
            return res.status(400).json({ mensaje: 'No se puede editar una orden cancelada' });
        }

        const updated = await prisma.salesOrder.update({
            where: { order_id: BigInt(id) },
            data: {
                client_id: client_id ? BigInt(client_id) : orden.client_id,
                client_address_id: client_address_id ? BigInt(client_address_id) : orden.client_address_id,
                delivery_date: delivery_date ? new Date(delivery_date + 'T00:00:00.000Z') : orden.delivery_date,
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
    cambiarEstadoOrden,
    autoGuardarOrden,
    agregarLinea,
    actualizarLinea,
    eliminarLinea,
    asignarInventario,
    liberarAsignacion,
    updateOrderHeader
};
