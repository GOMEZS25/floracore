const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { subWeeks, addWeeks, endOfISOWeek, isAfter } = require('date-fns');
const { calculateCutWeek, isoWeekToDate } = require('../utils/isoWeek');
const { groupStemsByIsoWeek, calculateMovingAverageDemand, MOVING_AVERAGE_WINDOW } = require('../utils/movingAverage');


// PROYECCIONES


// Disponibilidad proyectada por semana ISO para un producto en un rango
const obtenerDisponibilidad = async (req, res) => {
    try {
        const { product_id, week_from, year_from, week_to, year_to } = req.query;

        if (!product_id || !week_from || !year_from || !week_to || !year_to) {
            return res.status(400).json({ mensaje: 'Los parámetros product_id, week_from, year_from, week_to y year_to son obligatorios' });
        }

        const weekFrom = Number(week_from);
        const yearFrom = Number(year_from);
        const weekTo = Number(week_to);
        const yearTo = Number(year_to);

        if ([weekFrom, yearFrom, weekTo, yearTo].some(n => !Number.isInteger(n))) {
            return res.status(400).json({ mensaje: 'week_from, year_from, week_to y year_to deben ser números enteros' });
        }

        if (yearFrom > yearTo || (yearFrom === yearTo && weekFrom > weekTo)) {
            return res.status(400).json({ mensaje: 'El inicio del rango debe ser anterior o igual al final' });
        }

        const producto = await prisma.product.findUnique({
            where: { product_id: BigInt(product_id) },
        });

        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        const proyecciones = await prisma.projection.findMany({
            where: {
                AND: [
                    { OR: [{ year: { gt: yearFrom } }, { year: yearFrom, week_number: { gte: weekFrom } }] },
                    { OR: [{ year: { lt: yearTo } }, { year: yearTo, week_number: { lte: weekTo } }] },
                ],
                details: { some: { product_id: BigInt(product_id) } },
            },
            include: {
                details: {
                    where: { product_id: BigInt(product_id) },
                },
            },
            orderBy: [{ year: 'asc' }, { week_number: 'asc' }],
        });

        // Suma de stems_projected agrupada por semana ISO
        const totalesPorSemana = new Map();

        for (const proyeccion of proyecciones) {
            const key = `${proyeccion.year}-${proyeccion.week_number}`;
            const suma = proyeccion.details.reduce((acc, d) => acc + d.stems_projected, 0);

            if (!totalesPorSemana.has(key)) {
                totalesPorSemana.set(key, {
                    year: proyeccion.year,
                    week_number: proyeccion.week_number,
                    stems_projected: 0,
                });
            }
            totalesPorSemana.get(key).stems_projected += suma;
        }

        return res.status(200).json({
            mensaje: 'Disponibilidad proyectada obtenida exitosamente',
            data: {
                product_id: String(product_id),
                weeks: Array.from(totalesPorSemana.values()),
            },
        });

    } catch (error) {
        console.error('Error al obtener disponibilidad proyectada:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};


// Demanda estimada por semana ISO para un producto en un rango, usando
// promedio móvil de ventana fija (8 semanas) sobre ventas históricas
// (SalesOrder.status APROBADA o DESPACHADA, SalesOrderDetail.total_stems).
// Semanas sin ventas cuentan como 0; el denominador siempre es 8.
const obtenerDemandaEstimada = async (req, res) => {
    try {
        const { product_id, week_from, year_from, week_to, year_to, adjustment_factor } = req.query;

        if (!product_id || !week_from || !year_from || !week_to || !year_to) {
            return res.status(400).json({ mensaje: 'Los parámetros product_id, week_from, year_from, week_to y year_to son obligatorios' });
        }

        const weekFrom = Number(week_from);
        const yearFrom = Number(year_from);
        const weekTo = Number(week_to);
        const yearTo = Number(year_to);
        const adjustmentFactor = adjustment_factor !== undefined ? Number(adjustment_factor) : 0;

        if ([weekFrom, yearFrom, weekTo, yearTo].some(n => !Number.isInteger(n))) {
            return res.status(400).json({ mensaje: 'week_from, year_from, week_to y year_to deben ser números enteros' });
        }

        if (Number.isNaN(adjustmentFactor)) {
            return res.status(400).json({ mensaje: 'adjustment_factor debe ser un número' });
        }

        if (yearFrom > yearTo || (yearFrom === yearTo && weekFrom > weekTo)) {
            return res.status(400).json({ mensaje: 'El inicio del rango debe ser anterior o igual al final' });
        }

        const producto = await prisma.product.findUnique({
            where: { product_id: BigInt(product_id) },
        });

        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        const firstTargetMonday = isoWeekToDate(yearFrom, weekFrom);
        const lastTargetMonday = isoWeekToDate(yearTo, weekTo);

        // Rango de ventas necesario: desde las 8 semanas previas a la primera semana
        // pedida, hasta el cierre de la semana anterior a la última (una semana nunca
        // se promedia consigo misma).
        const historyStart = subWeeks(firstTargetMonday, MOVING_AVERAGE_WINDOW);
        const historyEnd = endOfISOWeek(subWeeks(lastTargetMonday, 1));

        // Se trae SalesOrder.status junto con SalesOrderDetail.total_stems y
        // SalesOrder.delivery_date; el filtro APROBADA/DESPACHADA lo aplica
        // groupStemsByIsoWeek para que la regla de negocio quede en un solo lugar testeable.
        const detalles = await prisma.salesOrderDetail.findMany({
            where: {
                product_id: BigInt(product_id),
                order: { delivery_date: { gte: historyStart, lte: historyEnd } },
            },
            select: {
                total_stems: true,
                order: { select: { status: true, delivery_date: true } },
            },
        });

        const stemsPorSemana = groupStemsByIsoWeek(
            detalles.map(d => ({
                status: d.order.status,
                delivery_date: d.order.delivery_date,
                total_stems: d.total_stems,
            }))
        );

        const weeks = [];
        let cursor = firstTargetMonday;

        while (!isAfter(cursor, lastTargetMonday)) {
            const { week_number, year } = calculateCutWeek(cursor, 0);
            const demand_estimated = calculateMovingAverageDemand(stemsPorSemana, cursor, adjustmentFactor);

            weeks.push({ year, week_number, demand_estimated });

            cursor = addWeeks(cursor, 1);
        }

        return res.status(200).json({
            mensaje: 'Demanda estimada calculada exitosamente',
            data: {
                product_id: String(product_id),
                adjustment_factor: adjustmentFactor,
                weeks,
            },
        });

    } catch (error) {
        console.error('Error al obtener demanda estimada:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
};


module.exports = {
    obtenerDisponibilidad,
    obtenerDemandaEstimada,
};
