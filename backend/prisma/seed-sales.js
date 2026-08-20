// Seed de ventas historicas para probar el motor de demanda (promedio movil) de la slice 3.
// Genera ~24 meses de SalesOrder/SalesOrderDetail con estacionalidad colombiana deliberada
// para las variedades activas en la base: Rosa y Pompon (no existe "Clavel" en esta DB).
//
// Idempotente: en cada corrida revierte el inventario reservado por las ordenes actuales,
// borra TODOS los SalesOrder/SalesOrderDetail y los vuelve a generar desde cero.
// No toca productos, variantes, clientes, usuarios, siembras ni proyecciones.
//
// Ejecutar a mano (no esta cableado a `prisma db seed`): node prisma/seed-sales.js

process.env.TZ = 'America/Bogota'; // mismo huso horario que usa el resto del backend (ver app.js)

const { PrismaClient } = require('@prisma/client');
const {
    startOfISOWeekYear,
    addWeeks,
    subWeeks,
    subMonths,
    getISOWeek,
    getISOWeekYear,
    isAfter,
} = require('date-fns');

const prisma = new PrismaClient();

// Variedades activas en la base. Rosa toma el rol de pico mas fuerte de San Valentin
// (no hay Clavel en esta DB, y las rosas son realistamente el driver mas fuerte de esa fecha).
const VARIETIES = [
    {
        product_id: 2n,
        name: 'Rosa',
        baseWeekly: 500,
        unitPrice: 0.35,
        valentinesPeak: 4.0,
        mothersPeak: 2.8,
        allSoulsPeak: 1.5,
        christmasPeak: 2.0,
    },
    {
        product_id: 3n,
        name: 'Pompon',
        baseWeekly: 300,
        unitPrice: 0.20,
        valentinesPeak: 3.0,
        mothersPeak: 2.3,
        allSoulsPeak: 1.5,
        christmasPeak: 1.6,
    },
];

// Clientes activos con direccion ENTREGA activa; se rotan entre las ordenes generadas.
const CLIENTS = [
    { client_id: 5n, client_address_id: 10n },  // VARAGA
    { client_id: 10n, client_address_id: 11n }, // FLORES LA CLARITA 1
];

const CREATED_BY = 1n; // usuario existente

const NOISE_RANGE = 0.125; // +/-12.5%, dentro del rango 10-15% pedido; unico uso de random

// Multiplicador estacional DELIBERADO (no aleatorio) para una variedad y semana ISO dada.
const seasonalMultiplier = (variety, weekNumber) => {
    if (weekNumber >= 5 && weekNumber <= 6) return variety.valentinesPeak;   // San Valentin
    if (weekNumber >= 18 && weekNumber <= 19) return variety.mothersPeak;    // Dia de la Madre
    if (weekNumber >= 43 && weekNumber <= 44) return variety.allSoulsPeak;   // Dia de Difuntos
    if (weekNumber >= 50 && weekNumber <= 51) return variety.christmasPeak;  // Navidad
    return 1.0; // linea base
};

const withNoise = (value) => {
    const noise = 1 + (Math.random() * 2 - 1) * NOISE_RANGE;
    return Math.round(value * noise);
};

const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Lista de lunes ISO entre start y end (inclusive).
const buildWeekRange = (start, end) => {
    const weeks = [];
    let cursor = startOfISOWeekYear(start);
    while (isAfter(start, cursor)) {
        cursor = addWeeks(cursor, 1);
    }
    while (!isAfter(cursor, end)) {
        weeks.push(cursor);
        cursor = addWeeks(cursor, 1);
    }
    return weeks;
};

// Revierte en el lote el efecto neto de una asignacion existente, segun el estado
// actual de su orden, dejando el lote como si esa orden nunca hubiera existido.
const revertAssignment = async (tx, assignment, orderStatus) => {
    if (orderStatus === 'BORRADOR' || orderStatus === 'APROBADA') {
        await tx.lote.update({
            where: { lote_id: assignment.lote_id },
            data: {
                cantidad_disponible: { increment: assignment.quantity },
                cantidad_reservada: { decrement: assignment.quantity },
            },
        });
    } else if (orderStatus === 'DESPACHADA') {
        await tx.lote.update({
            where: { lote_id: assignment.lote_id },
            data: { cantidad_disponible: { increment: assignment.quantity } },
        });
    }
    // CANCELADA: la orden ya revirtio su propio efecto en inventario, no se hace nada.
};

const wipeExistingOrders = async (tx) => {
    const assignments = await tx.salesOrderAssignment.findMany({
        select: {
            lote_id: true,
            quantity: true,
            detail: { select: { order: { select: { status: true } } } },
        },
    });

    for (const asgn of assignments) {
        await revertAssignment(tx, asgn, asgn.detail.order.status);
    }

    await tx.salesOrderDetail.deleteMany({}); // cascada: borra tambien sales_order_assignments
    await tx.salesOrder.deleteMany({});
};

const buildOrderLines = (weekMonday) => {
    const weekNumber = getISOWeek(weekMonday);
    const year = getISOWeekYear(weekMonday);

    return VARIETIES.map((variety) => {
        const multiplier = seasonalMultiplier(variety, weekNumber);
        const totalStems = Math.max(1, withNoise(variety.baseWeekly * multiplier));
        return { variety, year, totalStems };
    });
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const seed = async () => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 24);
    const weeks = buildWeekRange(startDate, endDate);
    const recentCutoff = subWeeks(endDate, 8); // ultimas 8 semanas quedan como APROBADA, el resto DESPACHADA

    const summary = {}; // { [variedad]: { [year]: totalStems } }
    const monthlySummary = {}; // { [variedad]: { [year-month]: totalStems } }
    let ordersCreated = 0;

    await prisma.$transaction(async (tx) => {
        await wipeExistingOrders(tx);

        let orderNumber = 1;

        for (let i = 0; i < weeks.length; i++) {
            const weekMonday = weeks[i];
            const lines = buildOrderLines(weekMonday);
            const client = CLIENTS[i % CLIENTS.length];
            const status = isAfter(weekMonday, recentCutoff) ? 'APROBADA' : 'DESPACHADA';

            const order = await tx.salesOrder.create({
                data: {
                    order_number: orderNumber++,
                    client_id: client.client_id,
                    client_address_id: client.client_address_id,
                    delivery_date: weekMonday,
                    status,
                    created_by: CREATED_BY,
                },
            });
            ordersCreated++;

            let lineNumber = 1;
            for (const line of lines) {
                const price = line.variety.unitPrice;
                const subtotal = Math.round(line.totalStems * price * 100) / 100;

                await tx.salesOrderDetail.create({
                    data: {
                        order_id: order.order_id,
                        product_id: line.variety.product_id,
                        line_number: lineNumber++,
                        packaging_type: 'TALLO',
                        quantity: line.totalStems,
                        total_stems: line.totalStems,
                        unit_price: price,
                        subtotal,
                    },
                });

                const name = line.variety.name;
                summary[name] = summary[name] || {};
                summary[name][line.year] = (summary[name][line.year] || 0) + line.totalStems;

                monthlySummary[name] = monthlySummary[name] || {};
                const mKey = monthKey(weekMonday);
                monthlySummary[name][mKey] = (monthlySummary[name][mKey] || 0) + line.totalStems;
            }
        }
    });

    console.log('--- SEED DE VENTAS COMPLETADO ---');
    console.log(`Ordenes creadas: ${ordersCreated}`);
    console.log(`Rango de fechas: ${formatLocalDate(weeks[0])} a ${formatLocalDate(weeks[weeks.length - 1])}`);
    console.log('Total de tallos por variedad y año:');
    for (const [name, years] of Object.entries(summary)) {
        for (const [year, total] of Object.entries(years).sort()) {
            console.log(`  ${name} ${year}: ${total} tallos`);
        }
    }
    console.log('Total de tallos por variedad y mes (para verificar los picos: feb vs mar/ago):');
    for (const [name, months] of Object.entries(monthlySummary)) {
        for (const [month, total] of Object.entries(months).sort()) {
            console.log(`  ${name} ${month}: ${total} tallos`);
        }
    }
};

seed()
    .catch((err) => {
        console.error('Error en seed de ventas:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
