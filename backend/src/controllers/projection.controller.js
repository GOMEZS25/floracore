const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


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


module.exports = {
    obtenerDisponibilidad,
};
