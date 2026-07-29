const { getISOWeek, getISOWeekYear } = require('date-fns');

// Calculates the ISO cut week from a planting date.
// Rule: always add DAYS to the date (weeksToCut * 7) and only then
// extract the ISO week/year. Never add to the week number directly.
// The date is normalized from its UTC components because planting dates
// arrive as date-only values (JSON 'YYYY-MM-DD' or Prisma @db.Date),
// which parse as UTC midnight and would shift a day in local time.
const calculateCutWeek = (plantingDate, weeksToCut) => {
    const date = new Date(plantingDate);
    const cutDate = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + Number(weeksToCut) * 7
    );

    return {
        week_number: getISOWeek(cutDate),
        year: getISOWeekYear(cutDate),
    };
};

module.exports = { calculateCutWeek };
