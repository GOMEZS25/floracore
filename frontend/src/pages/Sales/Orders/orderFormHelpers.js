export const buildLotLabel = (lote) => {
  const productName = lote.product?.name || '';
  const attrStr = lote.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
  const fullName = `${productName} ${attrStr}`.trim();
  const disp = lote.cantidad_disponible;
  const unidad = lote.unidad_medida?.toLowerCase() || 'tallos';
  return { fullName, disp, unidad, label: `${fullName} - ${lote.numero_lote}` };
};

export const getCurrencySymbol = (currency) => {
  if (currency === 'USD') return 'USD';
  if (currency === 'EUR') return '€';
  return '$';
};

export const formatMoney = (value) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);

export const getAssignmentSummary = (detail) => {
  const total = Number(detail.total_stems) || 0;
  const assigned = (detail.assignments || []).reduce((s, a) => s + Number(a.quantity), 0);
  return { total, assigned, pending: total - assigned };
};
