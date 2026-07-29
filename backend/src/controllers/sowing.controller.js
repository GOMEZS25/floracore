const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { serializeBigInt } = require('../utils/bigint.helper');
const { calculateCutWeek } = require('../utils/isoWeek');


// SIEMBRAS


// Crear siembra
const crearSiembra = async (req, res) => {
    try {
        const { location_id, planting_date, estimated_cut_week, details } = req.body;

        // Validar campos obligatorios
        // estimated_cut_week OBSOLETO: ya no se exige, ver Product.weeks_to_cut
        if (!location_id || !planting_date || !details || !Array.isArray(details) || details.length === 0) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios y details debe ser un array válido' });
        }

        // Validar que la ubicación existe y es de tipo CAMA
        const ubicacion = await prisma.inventoryLocation.findUnique({
            where: { location_id: Number(location_id) },
        });

        if (!ubicacion || !ubicacion.is_active) {
            return res.status(404).json({ mensaje: 'Ubicación no encontrada' });
        }

        if (ubicacion.type !== 'CAMA') {
            return res.status(400).json({ mensaje: 'La ubicación debe ser de tipo CAMA' });
        }

        // Validar que todos los productos existen
        const productIds = details.map(d => BigInt(d.product_id));
        const productos = await prisma.product.findMany({
            where: { product_id: { in: productIds }, is_active: true },
        });

        if (productos.length !== productIds.length) {
            return res.status(404).json({ mensaje: 'Uno o más productos no fueron encontrados o están inactivos' });
        }

        // Si existe una siembra ACTIVA para esa cama, cerrarla automáticamente
        const siembraActiva = await prisma.sowing.findFirst({
            where: {
                location_id: Number(location_id),
                status: 'ACTIVA',
            },
        });

        let siembra;

        await prisma.$transaction(async (tx) => {
            if (siembraActiva) {
                await tx.sowing.update({
                    where: { sowing_id: siembraActiva.sowing_id },
                    data: { status: 'CERRADA' },
                });
            }

            const nuevaSiembra = await tx.sowing.create({
                data: {
                    location_id: Number(location_id),
                    planting_date: new Date(planting_date),
                    estimated_cut_week: estimated_cut_week !== undefined ? Number(estimated_cut_week) : undefined,
                    created_by: BigInt(req.usuario.id),
                    details: {
                        create: details.map(d => ({
                            product_id: BigInt(d.product_id),
                            stems_planted: Number(d.stems_planted)
                        }))
                    },
                },
            });

            // Una proyección por producto: cada uno tiene su propio
            // weeks_to_cut y default_waste_pct
            const productosPorId = new Map(productos.map(p => [p.product_id.toString(), p]));

            for (const d of details) {
                const producto = productosPorId.get(String(d.product_id));
                const { week_number, year } = calculateCutWeek(planting_date, producto.weeks_to_cut);
                const stemsProjected = Math.round(
                    Number(d.stems_planted) * (1 - Number(producto.default_waste_pct) / 100)
                );

                await tx.projection.create({
                    data: {
                        sowing_id: nuevaSiembra.sowing_id,
                        week_number,
                        year,
                        details: {
                            create: {
                                product_id: BigInt(d.product_id),
                                stems_projected: stemsProjected,
                            }
                        }
                    },
                });
            }

            siembra = await tx.sowing.findUnique({
                where: { sowing_id: nuevaSiembra.sowing_id },
                include: {
                    details: true,
                    projections: {
                        include: { details: true }
                    }
                }
            });
        });

        return res.status(201).json({
            mensaje: siembraActiva
                ? 'Siembra anterior cerrada y nueva siembra creada exitosamente'
                : 'Siembra creada exitosamente',
            data: serializeBigInt(siembra),
        });

    } catch (error) {
        console.error('Error al crear siembra:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};



// Listar siembras con filtros opcionales
const listarSiembras = async (req, res) => {
    try {
        const { location_id, product_id, status } = req.query;

        const where = {};

        if (location_id) where.location_id = Number(location_id);
        if (product_id) {
            where.details = { some: { product_id: BigInt(product_id) } };
        }
        if (status) where.status = status;

        const siembras = await prisma.sowing.findMany({
            where,
            include: {
                location: {
                    select: {
                        location_id: true,
                        name: true,
                        type: true,
                    },
                },
                details: {
                    include: {
                        product: {
                            select: {
                                product_id: true,
                                sku: true,
                                name: true,
                                unit_of_measure: true,
                            },
                        }
                    }
                },
            },
            orderBy: { planting_date: 'desc' },
        });

        return res.status(200).json({
            mensaje: 'Siembras listadas exitosamente',
            data: siembras.map(serializeBigInt),
        });

    } catch (error) {
        console.error('Error al listar siembras:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};



// Obtener una siembra por ID
const obtenerSiembra = async (req, res) => {
    try {
        const { id } = req.params;

        const siembra = await prisma.sowing.findUnique({
            where: { sowing_id: BigInt(id) },
            include: {
                location: {
                    select: {
                        location_id: true,
                        name: true,
                        type: true,
                        description: true,
                    },
                },
                details: {
                    include: {
                        product: {
                            select: {
                                product_id: true,
                                sku: true,
                                name: true,
                                unit_of_measure: true,
                            },
                        }
                    }
                },
            },
        });

        if (!siembra) {
            return res.status(404).json({ mensaje: 'Siembra no encontrada' });
        }

        return res.status(200).json({
            mensaje: 'Siembra obtenida exitosamente',
            data: serializeBigInt(siembra),
        });

    } catch (error) {
        console.error('Error al obtener siembra:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};



// Cerrar siembra manualmente
const cerrarSiembra = async (req, res) => {
    try {
        const { id } = req.params;

        const siembra = await prisma.sowing.findUnique({
            where: { sowing_id: BigInt(id) },
        });

        if (!siembra) {
            return res.status(404).json({ mensaje: 'Siembra no encontrada' });
        }

        if (siembra.status === 'CERRADA') {
            return res.status(400).json({ mensaje: 'La siembra ya está cerrada' });
        }

        const siembraCerrada = await prisma.sowing.update({
            where: { sowing_id: BigInt(id) },
            data: { status: 'CERRADA' },
        });

        return res.status(200).json({
            mensaje: 'Siembra cerrada exitosamente',
            data: serializeBigInt(siembraCerrada),
        });

    } catch (error) {
        console.error('Error al cerrar siembra:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};


module.exports = {
    crearSiembra,
    listarSiembras,
    obtenerSiembra,
    cerrarSiembra,
};
