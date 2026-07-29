const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateCutWeek } = require('../src/utils/isoWeek');

// Caso normal: 2026-06-01 + 8 semanas = corte 2026-07-27 (lunes) -> semana ISO 31 de 2026
test('caso normal: siembra 2026-06-01 + 8 semanas -> semana 31, año 2026', () => {
    const result = calculateCutWeek('2026-06-01', 8);
    assert.deepEqual(result, { week_number: 31, year: 2026 });
});

// Cruce de año: 2025-12-20 + 2 semanas = corte 2026-01-03 -> semana 1 del AÑO SIGUIENTE (2026)
test('cruce de año: siembra 2025-12-20 + 2 semanas -> semana 1, año 2026', () => {
    const result = calculateCutWeek('2025-12-20', 2);
    assert.deepEqual(result, { week_number: 1, year: 2026 });
});

// Año ISO de 53 semanas: 2026 tiene 53 semanas (1-ene-2026 es jueves).
// 2026-12-20 + 2 semanas = corte 2027-01-03, que pertenece a la semana 53
// del año ISO 2026 aunque la fecha calendario ya es 2027.
// getISOWeekYear (no getFullYear) es lo que da el año correcto aquí.
test('límite 2026→2027: siembra 2026-12-20 + 2 semanas -> semana 53, año ISO 2026', () => {
    const result = calculateCutWeek('2026-12-20', 2);
    assert.deepEqual(result, { week_number: 53, year: 2026 });
});
