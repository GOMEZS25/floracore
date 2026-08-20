const { subWeeks } = require('date-fns');
const { calculateCutWeek } = require('./isoWeek');

const MOVING_AVERAGE_WINDOW = 8;
const DEMAND_STATUSES = ['APROBADA', 'DESPACHADA'];

// Agrupa tallos vendidos por semana ISO a partir de líneas de pedido crudas
// ({ status, delivery_date, total_stems }). Solo cuentan como demanda los
// pedidos APROBADA o DESPACHADA; BORRADOR y CANCELADA se ignoran.
const groupStemsByIsoWeek = (orderDetails) => {
    const stemsByWeekKey = new Map();

    for (const detail of orderDetails) {
        if (!DEMAND_STATUSES.includes(detail.status)) continue;

        const { week_number, year } = calculateCutWeek(detail.delivery_date, 0);
        const key = `${year}-${week_number}`;
        stemsByWeekKey.set(key, (stemsByWeekKey.get(key) || 0) + detail.total_stems);
    }

    return stemsByWeekKey;
};

// Promedio móvil de ventana fija (8 semanas) sobre el mapa de ventas por semana ISO,
// para estimar la demanda de la semana cuyo lunes es targetWeekMonday.
// Semanas sin datos en el mapa cuentan como 0; el denominador siempre es 8.
const calculateMovingAverageDemand = (stemsByWeekKey, targetWeekMonday, adjustmentFactor = 0) => {
    let sum = 0;
    for (let i = 1; i <= MOVING_AVERAGE_WINDOW; i++) {
        const { week_number, year } = calculateCutWeek(subWeeks(targetWeekMonday, i), 0);
        sum += stemsByWeekKey.get(`${year}-${week_number}`) || 0;
    }

    const average = sum / MOVING_AVERAGE_WINDOW;
    return Math.round(average * (1 + adjustmentFactor));
};

module.exports = { groupStemsByIsoWeek, calculateMovingAverageDemand, MOVING_AVERAGE_WINDOW };
