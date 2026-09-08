export const buildLotLabel = (lote) => {
  const productName = lote.product?.name || '';
  const attrStr = lote.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
  const fullName = `${productName} ${attrStr}`.trim();
  const disp = lote.cantidad_disponible;
  const unidad = lote.unidad_medida?.toLowerCase() || 'tallos';
  return { fullName, disp, unidad, label: `${fullName} - ${lote.numero_lote}` };
};

export const getCurrencySymbol = (currency) => {
  if (currency === 'USD') return 'US$';
  if (currency === 'EUR') return '€';
  return '$';
};

// Number only ("1.234,56"): dot thousands, comma decimals, always 2 decimals.
// Use it where the currency is already declared elsewhere, such as the body of
// the PDF table.
export const formatNumber = (value) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);

// Single source for money shown to the user ("US$ 1.234,56"). The symbol lives
// here, never in the JSX of the callers.
export const formatMoney = (value, currency) =>
  `${getCurrencySymbol(currency)} ${formatNumber(value)}`;

export const getAssignmentSummary = (detail) => {
  const total = Number(detail.total_stems) || 0;
  const assigned = (detail.assignments || []).reduce((s, a) => s + Number(a.quantity), 0);
  return { total, assigned, pending: total - assigned };
};
