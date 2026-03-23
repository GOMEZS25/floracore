const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');


// Crear Movimiento de Stock
const crearMovimiento = async (req, res) => {
    try {
        const { lote_id } = req.params;
        const { movement_type, quantity, notes } = req.body;

        console.log('PARAMS:', req.params);
        console.log('BODY:', req.body);

        if (!lote_id || !movement_type || !quantity) {
            return res.status(400).json({ mensaje: "lote_id, movement_type y quantity son obligatorios" });
        }

        const tiposValidos = ['ENTRADA', 'VENTA', 'DESPERDICIO', 'RESERVA'];
        if (!tiposValidos.includes(movement_type)) {
            return res.status(400).json({ mensaje: "movement_type no es válido. Debe ser: ENTRADA, VENTA, DESPERDICIO o RESERVA" });
        }


        const lote = await prisma.lote.findUnique({
            where: { lote_id: BigInt(lote_id) }
        });

        if (!lote) {
            return res.status(404).json({ mensaje: "Lote no encontrado" });
        }

        const cantidadMovimiento = Number(quantity);
        const disponible = Number(lote.cantidad_disponible);


        if (movement_type === 'VENTA' || movement_type === 'DESPERDICIO' || movement_type === 'RESERVA') {
            if (cantidadMovimiento > disponible) {
                return res.status(400).json({
                    mensaje: "Stock insuficiente",
                    disponible: disponible,
                    solicitado: cantidadMovimiento
                });
            }
        }


        const resultado = await prisma.$transaction(async (tx) => {
            // Crear el movimiento
            const movimiento = await tx.stockMovement.create({
                data: {
                    lote_id: BigInt(lote_id),
                    movement_type,
                    quantity: cantidadMovimiento,
                    notes: notes || null,
                    created_by: BigInt(req.usuario.id),
                }
            });

            // Calcular nueva cantidad disponible
            let nuevaDisponible = disponible;
            const dataUpdate = {};

            if (movement_type === 'ENTRADA') {
                nuevaDisponible = disponible + cantidadMovimiento;
            } else {
                // VENTA, DESPERDICIO, RESERVA restan del disponible
                nuevaDisponible = disponible - cantidadMovimiento;
            }

            dataUpdate.cantidad_disponible = nuevaDisponible;

            // Si es RESERVA
            if (movement_type === 'RESERVA') {
                const reservadaActual = Number(lote.cantidad_reservada);
                dataUpdate.cantidad_reservada = reservadaActual + cantidadMovimiento;
            }

            // Si el disponible llega a 0, marcar como AGOTADO
            if (nuevaDisponible <= 0) {
                dataUpdate.estado = 'AGOTADO';
            }

            // Actualizar el lote
            const loteActualizado = await tx.lote.update({
                where: { lote_id: BigInt(lote_id) },
                data: dataUpdate
            });

            return { movimiento, loteActualizado };
        });

        return res.status(201).json({
            mensaje: "Movimiento creado exitosamente",
            data: serializeBigInt(resultado)
        });

    } catch (error) {
        console.error("Error al crear movimiento", error.message);
        return res.status(500).json({ mensaje: "Error interno en el servidor", detalle: error.message });
    }
};

module.exports = {
    crearMovimiento,
};
