import { Document, Page, Text, View, PDFViewer, StyleSheet } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { getCurrencySymbol, formatNumber, formatMoney } from './orderFormHelpers';
import { formatOrderNumber } from '../../../utils/orderNumber';

dayjs.extend(isoWeek);

// Same date expression used by the sales order list and the rest of the screens.
// Slicing to the first 10 chars keeps the PDF consistent with them, including the
// known timezone behavior: this must match the UI, not be "correct" on its own.
const formatDeliveryDate = (value) =>
  value
    ? dayjs(String(value).slice(0, 10))
      .toDate()
      .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

const getIsoWeek = (value) =>
  value ? String(dayjs(String(value).slice(0, 10)).isoWeek()) : '';

// Nullable columns must render blank, never "null" or "0".
const orEmpty = (value) =>
  value === null || value === undefined || value === '' ? '' : String(value);

const formatCount = (value) =>
  value === null || value === undefined || value === ''
    ? ''
    : (Number(value) || 0).toLocaleString('es-CO');

const buildName = (product, variant) => {
  const name = product?.name || '';
  const attrs = variant?.attributes?.map((a) => a.value?.value).join(' ') || '';
  return `${name} ${attrs}`.trim();
};

const buildProductName = (line) =>
  buildName(line.product, line.lote?.variant || line.variant);

// product_name_snapshot only stores the base product name ("Cushion"), which would
// make every component row identical. The variant relation carries what actually
// distinguishes them, and the order endpoint already includes it.
const buildComponentName = (component) =>
  buildName(component.component_product, component.component_variant);

const COLORS = {
  text: '#262626',
  muted: '#8c8c8c',
  border: '#bfbfbf',
  borderLight: '#e8e8e8',
  watermark: '#d9d9d9',
};

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 46, paddingHorizontal: 36, fontSize: 9, color: COLORS.text },

  // Full width band so the text is centered by the layout, then rotated around its
  // own center: anchoring it by a left offset pushed it off the right edge.
  watermarkBand: {
    position: 'absolute',
    top: 340,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watermark: {
    fontSize: 90,
    color: COLORS.watermark,
    transform: 'rotate(-45deg)',
    transformOrigin: 'center center',
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: 'bold' },
  headerMeta: { alignItems: 'flex-end' },
  headerMetaLine: { fontSize: 9, marginBottom: 2 },

  // Always rendered, so minHeight keeps the reserved space identical whether the
  // note is empty or short. Long notes (VARCHAR 500) still wrap and grow.
  fitoBox: {
    marginTop: 10,
    padding: 6,
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fitoLabel: { fontSize: 8, color: COLORS.muted, marginBottom: 2 },
  fitoText: { fontSize: 9 },

  clientBox: { marginTop: 10, marginBottom: 12 },
  clientName: { fontSize: 11, marginBottom: 3 },
  clientLine: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },

  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 4,
    fontSize: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingVertical: 3,
    fontSize: 8,
  },

  // Breakdown of assorted lines: no background fill, since fills do not survive
  // black and white printing. Only the name is indented; figures stay aligned
  // with the parent columns.
  assortmentLabel: {
    paddingLeft: 10,
    paddingTop: 2,
    paddingBottom: 1,
    fontSize: 7,
    color: COLORS.muted,
  },
  componentRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingVertical: 2,
    fontSize: 7,
    color: COLORS.muted,
  },
  componentName: { paddingLeft: 20 },

  colProduct: { width: '28%' },
  colMark: { width: '11%' },
  colBoxes: { width: '8%', textAlign: 'right' },
  colBunches: { width: '8%', textAlign: 'right' },
  colStemsBunch: { width: '9%', textAlign: 'right' },
  colStems: { width: '10%', textAlign: 'right' },
  colPrice: { width: '13%', textAlign: 'right' },
  colValue: { width: '13%', textAlign: 'right' },

  totalsBox: { marginTop: 12, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: 11, marginRight: 12 },
  totalValue: { fontSize: 13, fontWeight: 'bold' },
  totalsSummary: { fontSize: 8, color: COLORS.muted, marginTop: 4 },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
  },
});

export const SalesOrderPdfDocument = ({ order }) => {
  const client = order?.client || {};
  const address = order?.client_address || {};
  const lines = order?.details || [];

  // Body cells carry no symbol, so the column titles declare the document
  // currency once for the export clients that read this PDF.
  const currencySymbol = getCurrencySymbol(client.currency);
  const isDraft = order?.status === 'BORRADOR';
  // The FITO block is always rendered: an empty note shows the label with a blank value.
  const fitoText = orEmpty(order?.notes);

  // Decimal fields arrive as strings: convert before adding. Line subtotals are the
  // stored values (never recalculated from quantity * unit_price); only the final
  // sum is rounded, to clear floating point drift.
  const totalAmount =
    Math.round(lines.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0) * 100) / 100;
  const totalStems = lines.reduce((acc, l) => acc + (Number(l.total_stems) || 0), 0);
  const totalBoxes = lines.reduce((acc, l) => acc + (Number(l.total_boxes) || 0), 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {isDraft && (
          <View style={styles.watermarkBand} fixed>
            <Text style={styles.watermark}>BORRADOR</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <Text style={styles.title}>ORDEN DE VENTA</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaLine}>No. {formatOrderNumber(order?.order_number)}</Text>
            <Text style={styles.headerMetaLine}>
              Fecha de entrega: {formatDeliveryDate(order?.delivery_date)}
            </Text>
            <Text style={styles.headerMetaLine}>Semana: {getIsoWeek(order?.delivery_date)}</Text>
          </View>
        </View>

        <View style={styles.fitoBox}>
          <Text style={styles.fitoLabel}>FITO</Text>
          <Text style={styles.fitoText}>{fitoText}</Text>
        </View>

        <View style={styles.clientBox}>
          <Text style={styles.clientName}>
            {orEmpty(client.code)} - {orEmpty(client.name)}
          </Text>
          <Text style={styles.clientLine}>
            {orEmpty(address.city)}{address.city && address.country ? ', ' : ''}{orEmpty(address.country)}
          </Text>
          <Text style={styles.clientLine}>
            Términos de entrega: {orEmpty(client.delivery_terms)}
          </Text>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={styles.colProduct}>Producto</Text>
          <Text style={styles.colMark}>Marca</Text>
          <Text style={styles.colBoxes}>Cajas</Text>
          <Text style={styles.colBunches}>Ramos</Text>
          <Text style={styles.colStemsBunch}>Tallos/ramo</Text>
          <Text style={styles.colStems}>Total tallos</Text>
          <Text style={styles.colPrice}>Precio ({currencySymbol})</Text>
          <Text style={styles.colValue}>Valor ({currencySymbol})</Text>
        </View>

        {/* The parent line and its breakdown share one wrap={false} group, so an
            assorted line never leaves its components stranded on the next page. */}
        {lines.map((line) => {
          const components = line.components || [];

          return (
            <View key={String(line.detail_id)} wrap={false}>
              <View style={styles.row}>
                <Text style={styles.colProduct}>{buildProductName(line)}</Text>
                <Text style={styles.colMark}>{orEmpty(line.mark_code)}</Text>
                <Text style={styles.colBoxes}>{formatCount(line.total_boxes)}</Text>
                <Text style={styles.colBunches}>{formatCount(line.bunches_per_box)}</Text>
                <Text style={styles.colStemsBunch}>{formatCount(line.stems_per_bunch)}</Text>
                <Text style={styles.colStems}>{formatCount(line.total_stems)}</Text>
                <Text style={styles.colPrice}>
                  {formatNumber(line.unit_price)} /{orEmpty(line.billing_unit)}
                </Text>
                <Text style={styles.colValue}>{formatNumber(line.subtotal)}</Text>
              </View>

              {components.length > 0 && (
                <Text style={styles.assortmentLabel}>Surtido</Text>
              )}

              {/* Boxes, price and value stay blank on purpose: repeating the parent
                  price would invite adding up the child rows, which would not
                  match the order total. */}
              {components.map((component) => (
                <View style={styles.componentRow} key={String(component.component_id)}>
                  <Text style={[styles.colProduct, styles.componentName]}>
                    {buildComponentName(component)}
                  </Text>
                  <Text style={styles.colMark} />
                  <Text style={styles.colBoxes} />
                  <Text style={styles.colBunches}>{formatCount(component.bunches)}</Text>
                  <Text style={styles.colStemsBunch}>{formatCount(component.stems_per_bunch)}</Text>
                  <Text style={styles.colStems}>
                    {formatCount((Number(component.bunches) || 0) * (Number(component.stems_per_bunch) || 0))}
                  </Text>
                  <Text style={styles.colPrice} />
                  <Text style={styles.colValue} />
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(totalAmount, client.currency)}</Text>
          </View>
          <Text style={styles.totalsSummary}>
            {totalStems.toLocaleString('es-CO')} tallos · {totalBoxes.toLocaleString('es-CO')} cajas
          </Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};

// Default export is the viewer wrapper so that @react-pdf/renderer only ever gets
// imported through this lazy-loaded chunk, never from the order screen itself.
const SalesOrderPdfPreview = ({ order }) => (
  <PDFViewer style={{ width: '100%', height: '70vh', border: 'none' }}>
    <SalesOrderPdfDocument order={order} />
  </PDFViewer>
);

export default SalesOrderPdfPreview;
