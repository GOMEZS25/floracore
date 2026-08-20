process.env.TZ = 'America/Bogota'; // mismo huso horario que usa el resto del backend (ver app.js)

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isoWeekToDate } = require('../src/utils/isoWeek');
const {
    groupStemsByIsoWeek,
    calculateMovingAverageDemand,
    MOVING_AVERAGE_WINDOW,
} = require('../src/utils/movingAverage');

const week = (n) => isoWeekToDate(2025, n);
const targetWeekMonday = week(MOVING_AVERAGE_WINDOW + 1); // semana 9: la que se está estimando

test('promedio móvil: 4 semanas de 100 y 4 de 0 -> semana 9 da exactamente 50', () => {
    const stemsByWeekKey = new Map([
        ['2025-1', 100],
        ['2025-2', 100],
        ['2025-3', 100],
        ['2025-4', 100],
        ['2025-5', 0],
        ['2025-6', 0],
        ['2025-7', 0],
        ['2025-8', 0],
    ]);

    const demand = calculateMovingAverageDemand(stemsByWeekKey, targetWeekMonday, 0);
    assert.equal(demand, 50);
});

test('factor de ajuste: mismo caso con adjustment_factor=0.10 -> 55', () => {
    const stemsByWeekKey = new Map([
        ['2025-1', 100],
        ['2025-2', 100],
        ['2025-3', 100],
        ['2025-4', 100],
        ['2025-5', 0],
        ['2025-6', 0],
        ['2025-7', 0],
        ['2025-8', 0],
    ]);

    const demand = calculateMovingAverageDemand(stemsByWeekKey, targetWeekMonday, 0.10);
    assert.equal(demand, 55);
});

test('estado: un pedido BORRADOR o CANCELADA en el rango no afecta el promedio', () => {
    const orderDetails = [
        { status: 'DESPACHADA', delivery_date: week(1), total_stems: 100 },
        { status: 'APROBADA', delivery_date: week(2), total_stems: 100 },
        { status: 'DESPACHADA', delivery_date: week(3), total_stems: 100 },
        { status: 'APROBADA', delivery_date: week(4), total_stems: 100 },
        { status: 'BORRADOR', delivery_date: week(5), total_stems: 100000 },  // no debe contar
        { status: 'CANCELADA', delivery_date: week(6), total_stems: 100000 }, // no debe contar
    ];

    const stemsByWeekKey = groupStemsByIsoWeek(orderDetails);

    // Las semanas de pedidos ignorados ni siquiera quedan en el mapa
    assert.equal(stemsByWeekKey.has('2025-5'), false);
    assert.equal(stemsByWeekKey.has('2025-6'), false);

    const demand = calculateMovingAverageDemand(stemsByWeekKey, targetWeekMonday, 0);
    assert.equal(demand, 50);
});
