import React, { useState } from 'react';
import { Card, Table, Select, Input, InputNumber, Button, Tag, Popconfirm, Popover, Modal, Tooltip, Typography, notification, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, UndoOutlined, FileTextOutlined, FileTextFilled, AppstoreOutlined } from '@ant-design/icons';
import salesService from '../../../services/salesService';
import { getCurrencySymbol, formatMoney } from './orderFormHelpers';
import AssortmentModal, { mapServerComponents, toPayloadComponents, sumBunches, sumStems } from './AssortmentModal';

const { Text } = Typography;

const InlineLinesTable = ({ orderId, orderLines, allProducts, clientCurrency, isReadOnly, onLinesChanged }) => {
  const [captureRow, setCaptureRow] = useState({
    product_variant_key: null,
    cantidad_cajas: null,
    ramos_por_caja: null,
    tallos_por_ramo: null,
    unit_price: null,
    billing_unit: 'TALLO',
    upc: '',
    mark_code: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [rowEdits, setRowEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);

  // Detalle por línea: noteOpenId = fila con el Modal editable abierto;
  // hoverDetailId = fila con el preview de solo lectura por hover.
  // noteDraft / upcDraft son los borradores del Modal; al aplicar se
  // vuelcan a rowEdits (dirty).
  const [noteOpenId, setNoteOpenId] = useState(null);
  const [hoverDetailId, setHoverDetailId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [upcDraft, setUpcDraft] = useState('');

  // Surtido: los componentes de la línea que se está capturando viven aquí
  // hasta que el usuario da "+ Agregar"; los de una línea ya agregada viven en
  // rowEdits[detailId].components. assortmentOpenId identifica qué surtido está
  // abierto: 'capture' para la barra, o el detail_id de una fila.
  const [captureComponents, setCaptureComponents] = useState([]);
  const [assortmentOpenId, setAssortmentOpenId] = useState(null);

  const handleAdd = async () => {
    const { product_variant_key, cantidad_cajas, ramos_por_caja, tallos_por_ramo, unit_price } = captureRow;
    const isAssorted = captureComponents.length > 0;

    // En una caja surtida ramos/caja sale del surtido y tallos/ramo no aplica,
    // así que esos dos campos no se exigen.
    if (!product_variant_key || !cantidad_cajas || !unit_price) {
      notification.error({ message: 'Completa todos los campos' });
      return;
    }
    if (!isAssorted && (!ramos_por_caja || !tallos_por_ramo)) {
      notification.error({ message: 'Completa todos los campos' });
      return;
    }
    const parts = String(product_variant_key).split('_');
    const product_id = parts[0];
    const variant_id = parts[1] && parts[1] !== 'base' ? parts[1] : null;

    const payload = {
      lote_id: null,
      product_id,
      variant_id,
      packaging_type: 'CAJA',
      quantity: cantidad_cajas,
      tallos_por_ramo: isAssorted ? null : tallos_por_ramo,
      ramos_por_caja: isAssorted ? sumBunches(captureComponents) : ramos_por_caja,
      unit_price,
      billing_unit: captureRow.billing_unit,
      upc: captureRow.upc || null,
      mark_code: captureRow.mark_code || null,
      notes: captureRow.notes?.trim() ? captureRow.notes : null,
    };

    if (isAssorted) {
      payload.components = toPayloadComponents(captureComponents);
    }

    setSubmitting(true);
    try {
      await salesService.agregarLinea(orderId, payload);
      notification.success({ message: 'Línea agregada' });
      setCaptureRow({
        product_variant_key: null,
        cantidad_cajas: null,
        ramos_por_caja: null,
        tallos_por_ramo: null,
        unit_price: null,
        billing_unit: 'TALLO',
        upc: '',
        mark_code: '',
        notes: '',
      });
      setCaptureComponents([]);
      onLinesChanged();
    } catch (error) {
      notification.error({
        message: 'Error al agregar línea',
        description: error.response?.data?.mensaje || 'Error desconocido',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const captureIsAssorted = captureComponents.length > 0;

  // Contenido de UNA caja. En una caja surtida sale de los componentes; si no,
  // de los campos ramos/caja y tallos/ramo de la barra.
  const ramosPorCaja = captureIsAssorted
    ? sumBunches(captureComponents)
    : (Number(captureRow.ramos_por_caja) || 0);
  const tallosPorCaja = captureIsAssorted
    ? sumStems(captureComponents)
    : (Number(captureRow.ramos_por_caja) || 0) * (Number(captureRow.tallos_por_ramo) || 0);

  const totalRamosEstimado = (Number(captureRow.cantidad_cajas) || 0) * ramosPorCaja;
  const totalTallosEstimado = (Number(captureRow.cantidad_cajas) || 0) * tallosPorCaja;

  const calcSubtotal = () => {
    const cajas = Number(captureRow.cantidad_cajas) || 0;
    const price = Number(captureRow.unit_price) || 0;
    const bu = captureRow.billing_unit;

    if (bu === 'TALLO') {
      return totalTallosEstimado * price;
    }
    if (bu === 'RAMO') {
      return totalRamosEstimado * price;
    }
    if (bu === 'CAJA') {
      return cajas * price;
    }
    return 0;
  };

  const subtotalEstimado = calcSubtotal();

  const getRowValue = (row, field) => {
    const detailId = row.detail_id || row.id;
    if (rowEdits[detailId] && rowEdits[detailId][field] !== undefined) {
      return rowEdits[detailId][field];
    }
    return row[field];
  };

  // Firma comparable de un surtido, para detectar cambios reales (los arrays
  // nunca son iguales por identidad).
  const componentsSignature = (list) =>
    JSON.stringify(
      (list || []).map(c => [
        String(c.component_product_id),
        String(c.component_variant_id ?? ''),
        Number(c.bunches),
        Number(c.stems_per_bunch),
      ])
    );

  // Componentes vigentes de una fila: el borrador si el usuario tocó el
  // surtido, si no los que vinieron del servidor.
  const getRowComponents = (row) => {
    const detailId = row.detail_id || row.id;
    const edited = rowEdits[detailId]?.components;
    if (edited !== undefined) return edited;
    return mapServerComponents(row.components);
  };

  const isRowDirty = (row) => {
    const detailId = row.detail_id || row.id;
    const edits = rowEdits[detailId];
    if (!edits) return false;
    return Object.keys(edits).some(field => {
      if (field === 'components') {
        return componentsSignature(edits.components) !== componentsSignature(mapServerComponents(row.components));
      }
      return edits[field] !== row[field];
    });
  };

  const updateRowField = (row, field, value) => {
    const detailId = row.detail_id || row.id;
    setRowEdits(prev => ({
      ...prev,
      [detailId]: {
        ...(prev[detailId] || {}),
        [field]: value,
      },
    }));
  };

  const cancelRowEdits = (row) => {
    const detailId = row.detail_id || row.id;
    setRowEdits(prev => {
      const next = { ...prev };
      delete next[detailId];
      return next;
    });
  };

  const saveRow = async (row) => {
    const detailId = row.detail_id || row.id;
    const edits = rowEdits[detailId] || {};
    const components = getRowComponents(row);
    const isAssorted = components.length > 0;

    const payload = {
      packaging_type: row.packaging_type || 'CAJA',
      quantity: edits.quantity !== undefined ? edits.quantity : row.quantity,
      ramos_por_caja: edits.bunches_per_box !== undefined ? edits.bunches_per_box : row.bunches_per_box,
      tallos_por_ramo: edits.stems_per_bunch !== undefined ? edits.stems_per_bunch : row.stems_per_bunch,
      unit_price: edits.unit_price !== undefined ? edits.unit_price : row.unit_price,
      billing_unit: edits.billing_unit !== undefined ? edits.billing_unit : row.billing_unit,
      notes: edits.notes !== undefined ? edits.notes : row.notes,
      upc: edits.upc !== undefined ? edits.upc : row.upc,
      mark_code: edits.mark_code !== undefined ? edits.mark_code : row.mark_code,
    };

    if (isAssorted) {
      payload.ramos_por_caja = sumBunches(components);
      payload.tallos_por_ramo = null;
    }

    // Una línea surtida reenvía siempre su surtido: el backend solo recalcula
    // los totales del surtido cuando recibe components, y si se omite volvería
    // a calcularlos desde ramos/caja y tallos/ramo.
    if (isAssorted || edits.components !== undefined) {
      payload.components = toPayloadComponents(components);
    }

    setSavingRowId(detailId);
    try {
      await salesService.actualizarLinea(detailId, payload);
      notification.success({ message: 'Línea actualizada' });
      cancelRowEdits(row);
      onLinesChanged();
    } catch (error) {
      notification.error({
        message: 'Error al actualizar línea',
        description: error.response?.data?.mensaje || 'Error desconocido',
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const labelStyle = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--fc-text-secondary)', fontWeight: 500 };
  const fixedTagStyle = { padding: '4px 11px', border: '1px solid var(--fc-border)', borderRadius: 8, backgroundColor: '#f9fafb', color: 'var(--fc-text-secondary)', fontSize: 14 };

  // Bloque de solo lectura del detalle (nota + UPC). Reutilizado por el
  // preview de hover y por el Modal en modo isReadOnly. Lee del buffer de
  // edición vía getRowValue, con fallback al valor del servidor.
  const renderDetailReadOnly = (row) => {
    const noteVal = getRowValue(row, 'notes');
    const hasNote = noteVal != null && String(noteVal).trim() !== '';
    const upcVal = getRowValue(row, 'upc');
    const hasUpc = upcVal != null && String(upcVal).trim() !== '';
    return (
      <div style={{ maxWidth: 260 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Detalle</div>
        <div style={{ ...labelStyle, fontWeight: 400, marginBottom: 4 }}>Nota</div>
        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--fc-text-primary)', marginBottom: 10 }}>
          {hasNote ? noteVal : <Text type="secondary">Sin nota</Text>}
        </div>
        <div style={{ ...labelStyle, fontWeight: 400, marginBottom: 4 }}>UPC</div>
        <div style={{ color: 'var(--fc-text-primary)' }}>
          {hasUpc ? upcVal : <Text type="secondary">Sin UPC</Text>}
        </div>
      </div>
    );
  };

  const applyDetail = (row) => {
    const cleanNote = noteDraft.trim();
    updateRowField(row, 'notes', cleanNote.length ? cleanNote : null);
    const cleanUpc = upcDraft.trim();
    updateRowField(row, 'upc', cleanUpc.length ? cleanUpc : null);
    setNoteOpenId(null);
  };

  const columns = [
    {
      title: 'PRODUCTO',
      key: 'producto',
      render: (_, r) => {
        const n = r.product?.name || '';
        const a = (r.lote?.variant || r.variant)?.attributes?.map(x => x.value?.value).join(' ') || '';
        const detailId = r.detail_id || r.id;
        const noteVal = getRowValue(r, 'notes');
        const hasNote = noteVal != null && String(noteVal).trim() !== '';
        const upcVal = getRowValue(r, 'upc');
        const hasUpc = upcVal != null && String(upcVal).trim() !== '';
        const hasDetail = hasNote || hasUpc;
        const rowComponents = getRowComponents(r);

        return (
          <Space size={6} align="center">
            <Text strong>{`${n} ${a}`.trim()}</Text>
            {rowComponents.length > 0 && (
              <Tooltip title="Ver surtido de esta caja">
                <Tag
                  color="green"
                  style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => setAssortmentOpenId(detailId)}
                >
                  Surtida
                </Tag>
              </Tooltip>
            )}
            <Popover
              trigger="hover"
              mouseEnterDelay={0.3}
              open={hoverDetailId === detailId && noteOpenId === null}
              onOpenChange={(open) => setHoverDetailId(open ? detailId : null)}
              content={renderDetailReadOnly(r)}
            >
              <span
                role="button"
                tabIndex={0}
                title={hasDetail ? 'Ver / editar detalle' : 'Agregar detalle'}
                onClick={() => {
                  // El clic abre el Modal editable; el hover solo muestra el preview.
                  setHoverDetailId(null);
                  setNoteDraft(hasNote ? String(noteVal) : '');
                  setUpcDraft(hasUpc ? String(upcVal) : '');
                  setNoteOpenId(detailId);
                }}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
              >
                {hasDetail
                  ? <FileTextFilled style={{ color: 'var(--fc-accent)', fontSize: 15 }} />
                  : <FileTextOutlined style={{ color: 'var(--fc-text-secondary)', fontSize: 15, opacity: 0.55 }} />}
              </span>
            </Popover>
          </Space>
        );
      },
    },
    {
      title: 'TIPO DE CAJA',
      dataIndex: 'packaging_type',
      render: (val) => <Tag>{val || 'CAJA'}</Tag>,
      width: 100,
    },
    {
      title: 'MARCA',
      key: 'mark_code',
      width: 120,
      render: (_, r) => (
        <Input
          size="small"
          value={getRowValue(r, 'mark_code') ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            updateRowField(r, 'mark_code', v.trim() === '' ? null : v);
          }}
          disabled={isReadOnly}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'CAJAS',
      key: 'cajas',
      width: 90,
      align: 'right',
      render: (_, r) => (
        <InputNumber
          min={1}
          size="small"
          value={getRowValue(r, 'quantity')}
          onChange={(v) => updateRowField(r, 'quantity', v)}
          disabled={isReadOnly}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'RAMOS',
      key: 'ramos_caja',
      width: 110,
      align: 'right',
      render: (_, r) => {
        const rowComponents = getRowComponents(r);
        const assorted = rowComponents.length > 0;
        return (
          <InputNumber
            min={1}
            size="small"
            value={assorted ? sumBunches(rowComponents) : getRowValue(r, 'bunches_per_box')}
            onChange={(v) => updateRowField(r, 'bunches_per_box', v)}
            disabled={isReadOnly || assorted}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'TALLOS',
      key: 'tallos_ramo',
      width: 110,
      align: 'right',
      render: (_, r) => {
        const assorted = getRowComponents(r).length > 0;
        return (
          <InputNumber
            min={1}
            size="small"
            value={assorted ? null : getRowValue(r, 'stems_per_bunch')}
            placeholder={assorted ? '—' : undefined}
            onChange={(v) => updateRowField(r, 'stems_per_bunch', v)}
            disabled={isReadOnly || assorted}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'PRECIO UNT',
      key: 'unit_price',
      width: 130,
      align: 'right',
      render: (_, r) => (
        <InputNumber
          min={0}
          step={0.01}
          size="small"
          prefix={getCurrencySymbol(clientCurrency)}
          value={getRowValue(r, 'unit_price')}
          onChange={(v) => updateRowField(r, 'unit_price', v)}
          disabled={isReadOnly}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'UND PRECIO',
      key: 'price_unit',
      width: 100,
      render: (_, r) => (
        <Select
          size="small"
          value={getRowValue(r, 'billing_unit') || 'CAJA'}
          onChange={(v) => updateRowField(r, 'billing_unit', v)}
          disabled={isReadOnly}
          style={{ width: '100%' }}
          options={[
            { value: 'TALLO', label: 'TALLO' },
            { value: 'RAMO', label: 'RAMO' },
            { value: 'CAJA', label: 'CAJA' },
          ]}
        />
      ),
    },
    {
      title: 'TOTAL TALLOS',
      dataIndex: 'total_stems',
      width: 100,
      align: 'right',
    },
    {
      title: 'SUBTOTAL',
      key: 'subtotal',
      render: (_, r) => <Text strong>{getCurrencySymbol(clientCurrency)} {formatMoney(r.subtotal)}</Text>,
      width: 130,
      align: 'right',
    },
    {
      title: '',
      key: 'acciones',
      width: 155,
      render: (_, r) => {
        if (isReadOnly) return null;
        const dirty = isRowDirty(r);
        const detailId = r.detail_id || r.id;
        return (
          <Space size={4}>
            <Tooltip title="Surtido de la caja">
              <Button
                size="small"
                icon={<AppstoreOutlined />}
                onClick={() => setAssortmentOpenId(detailId)}
              />
            </Tooltip>
            {dirty && (
              <>
                <Tooltip title="Guardar cambios">
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    loading={savingRowId === detailId}
                    onClick={() => saveRow(r)}
                  />
                </Tooltip>
                <Tooltip title="Descartar cambios">
                  <Button
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={() => cancelRowEdits(r)}
                  />
                </Tooltip>
              </>
            )}
            {!dirty && (
              <Popconfirm
                title="¿Eliminar línea?"
                onConfirm={async () => {
                  try {
                    await salesService.eliminarLinea(detailId);
                    notification.success({ message: 'Línea eliminada' });
                    onLinesChanged();
                  } catch (e) {
                    notification.error({ message: 'Error al eliminar' });
                  }
                }}
              >
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  // La fila del Modal se deriva por id en cada render (nunca se guarda en
  // estado) para que refleje siempre el buffer vivo de rowEdits.
  const modalRow =
    noteOpenId != null
      ? (orderLines || []).find((r) => (r.detail_id || r.id) === noteOpenId)
      : null;

  // Fila cuyo surtido está abierto ('capture' = la barra de captura, que aún
  // no tiene fila).
  const assortmentRow =
    assortmentOpenId != null && assortmentOpenId !== 'capture'
      ? (orderLines || []).find((r) => (r.detail_id || r.id) === assortmentOpenId)
      : null;

  return (
    <Card
      variant="borderless"
      title={
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fc-text-primary)' }}>
          Líneas de la orden
        </span>
      }
      style={{
        marginBottom: 24,
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        border: '1px solid var(--fc-border)',
        backgroundColor: 'var(--fc-surface)',
      }}
      styles={{
        header: { border: 'none', paddingTop: 20, paddingBottom: 4 },
        body: { paddingTop: 12 },
      }}
    >
      {!isReadOnly && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1.2fr auto', gap: 12, alignItems: 'end', padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>PRODUCTO</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Select
                showSearch
                popupMatchSelectWidth={false}
                placeholder="Buscar producto..."
                value={captureRow.product_variant_key}
                onChange={(val) => setCaptureRow(prev => ({ ...prev, product_variant_key: val }))}
                filterOption={(input, option) => option?.label?.toString().toLowerCase().includes(input.toLowerCase())}
                options={allProducts.flatMap(p => {
                  if (!p.variants || p.variants.length === 0) {
                    return [{ value: `${p.product_id}_base`, label: p.name }];
                  }
                  return p.variants.map(v => {
                    const attrStr = v.attributes?.map(a => a.value?.value).join(' ') || '';
                    return { value: `${p.product_id}_${v.variant_id}`, label: attrStr ? `${p.name} ${attrStr}` : p.name };
                  });
                })}
                disabled={isReadOnly || !orderId}
                style={{ flex: 1, minWidth: 0 }}
              />
              <Tooltip title={captureRow.product_variant_key ? 'Surtir esta caja' : 'Elige primero el producto'}>
                <Button
                  icon={<AppstoreOutlined />}
                  onClick={() => setAssortmentOpenId('capture')}
                  disabled={isReadOnly || !orderId || !captureRow.product_variant_key}
                  type={captureIsAssorted ? 'primary' : 'default'}
                >
                  Surtir{captureIsAssorted ? ` (${captureComponents.length})` : ''}
                </Button>
              </Tooltip>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>TIPO DE CAJA</span>
            <div style={fixedTagStyle}>CAJA</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>CAJAS</span>
            <InputNumber min={1} value={captureRow.cantidad_cajas} onChange={(v) => setCaptureRow(prev => ({ ...prev, cantidad_cajas: v }))} disabled={isReadOnly || !orderId} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>RAMOS/CAJA</span>
            <InputNumber
              min={1}
              value={captureIsAssorted ? ramosPorCaja : captureRow.ramos_por_caja}
              onChange={(v) => setCaptureRow(prev => ({ ...prev, ramos_por_caja: v }))}
              disabled={isReadOnly || !orderId || captureIsAssorted}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>TALLOS/RAMO</span>
            <InputNumber
              min={1}
              value={captureIsAssorted ? null : captureRow.tallos_por_ramo}
              placeholder={captureIsAssorted ? '—' : undefined}
              onChange={(v) => setCaptureRow(prev => ({ ...prev, tallos_por_ramo: v }))}
              disabled={isReadOnly || !orderId || captureIsAssorted}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>PRECIO UNT</span>
            <InputNumber min={0} step={0.01} prefix={getCurrencySymbol(clientCurrency)} value={captureRow.unit_price} onChange={(v) => setCaptureRow(prev => ({ ...prev, unit_price: v }))} disabled={isReadOnly || !orderId} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>UND PRECIO</span>
            <Select
              value={captureRow.billing_unit}
              onChange={(val) => setCaptureRow(prev => ({ ...prev, billing_unit: val }))}
              disabled={isReadOnly || !orderId}
              style={{ width: '100%' }}
              options={[
                { value: 'TALLO', label: 'TALLO' },
                { value: 'RAMO', label: 'RAMO' },
                { value: 'CAJA', label: 'CAJA' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>UPC</span>
            <Input
              maxLength={13}
              value={captureRow.upc}
              onChange={(e) => setCaptureRow(prev => ({ ...prev, upc: e.target.value.replace(/\D/g, '') }))}
              disabled={isReadOnly || !orderId}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Marca</span>
            <Input
              maxLength={40}
              value={captureRow.mark_code}
              onChange={(e) => setCaptureRow(prev => ({ ...prev, mark_code: e.target.value }))}
              disabled={isReadOnly || !orderId}
            />
          </div>


          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>NOTAS</span>
            <Input
              maxLength={255}
              value={captureRow.notes}
              onChange={(e) => setCaptureRow(prev => ({ ...prev, notes: e.target.value }))}
              disabled={isReadOnly || !orderId}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {!orderId ? (
              <Tooltip title="Completa los datos generales primero">
                <Button type="primary" icon={<PlusOutlined />} disabled>Agregar</Button>
              </Tooltip>
            ) : (
              <Button type="primary" icon={<PlusOutlined />} loading={submitting} onClick={handleAdd}>Agregar</Button>
            )}
          </div>
        </div>
      )}

      {subtotalEstimado > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 12,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            width: '50%',
          }}>
            <div style={{
              backgroundColor: 'var(--fc-surface)',
              border: '1px solid var(--fc-border)',
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'var(--fc-text-secondary)',
                marginBottom: 4,
              }}>Cajas de esta línea</div>
              <div style={{
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--fc-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{(Number(captureRow.cantidad_cajas) || 0).toLocaleString('es-CO')}</div>
            </div>

            <div style={{
              backgroundColor: 'var(--fc-surface)',
              border: '1px solid var(--fc-border)',
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'var(--fc-text-secondary)',
                marginBottom: 4,
              }}>Ramos de esta línea</div>
              <div style={{
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--fc-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{totalRamosEstimado.toLocaleString('es-CO')}</div>
            </div>

            <div style={{
              backgroundColor: 'var(--fc-surface)',
              border: '1px solid var(--fc-border)',
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'var(--fc-text-secondary)',
                marginBottom: 4,
              }}>Tallos de esta línea</div>
              <div style={{
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--fc-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{totalTallosEstimado.toLocaleString('es-CO')}</div>
            </div>

            <div style={{
              backgroundColor: 'var(--fc-accent-soft)',
              border: '1px solid var(--fc-accent)',
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'var(--fc-accent)',
                marginBottom: 4,
              }}>Subtotal de esta línea</div>
              <div style={{
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--fc-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}>{getCurrencySymbol(clientCurrency)} {formatMoney(subtotalEstimado)}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 1, backgroundColor: 'var(--fc-border)', margin: '12px 0' }} />

      <style>{`
        .floracore-row-dirty > td {
          background-color: var(--fc-accent-soft) !important;
        }
      `}</style>

      <Table
        columns={columns}
        dataSource={orderLines}
        rowKey={r => r.detail_id || r.id}
        pagination={false}
        scroll={{ x: 1265 }}
        locale={{ emptyText: 'No hay líneas todavía' }}
        rowClassName={(r) => isRowDirty(r) ? 'floracore-row-dirty' : ''}
      />

      <Modal
        open={noteOpenId !== null}
        onCancel={() => setNoteOpenId(null)}
        destroyOnHidden
        title="Detalle"
        footer={
          isReadOnly
            ? [
                <Button key="close" onClick={() => setNoteOpenId(null)}>Cerrar</Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setNoteOpenId(null)}>Cancelar</Button>,
                <Button
                  key="apply"
                  type="primary"
                  onClick={() => modalRow && applyDetail(modalRow)}
                >
                  Aplicar
                </Button>,
              ]
        }
      >
        {modalRow &&
          (isReadOnly ? (
            renderDetailReadOnly(modalRow)
          ) : (
            <div>
              <div style={{ ...labelStyle, fontWeight: 400, marginBottom: 4 }}>Nota</div>
              <Input.TextArea
                autoFocus
                rows={3}
                maxLength={300}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Escribe una nota para esta línea..."
              />
              <div style={{ ...labelStyle, fontWeight: 400, margin: '10px 0 4px' }}>UPC</div>
              <Input
                value={upcDraft}
                onChange={(e) => setUpcDraft(e.target.value)}
                placeholder="Código UPC"
              />
              <div style={{ fontSize: 11, color: 'var(--fc-text-secondary)', marginTop: 4 }}>
                Formato esperado: 12 o 13 dígitos.
              </div>
            </div>
          ))}
      </Modal>

      {assortmentOpenId !== null && (
        <AssortmentModal
          open
          allProducts={allProducts}
          isReadOnly={isReadOnly}
          initialComponents={
            assortmentOpenId === 'capture'
              ? captureComponents
              : (assortmentRow ? getRowComponents(assortmentRow) : [])
          }
          onCancel={() => setAssortmentOpenId(null)}
          onSave={(components) => {
            if (assortmentOpenId === 'capture') {
              setCaptureComponents(components);
            } else if (assortmentRow) {
              updateRowField(assortmentRow, 'components', components);
            }
            setAssortmentOpenId(null);
          }}
        />
      )}
    </Card>
  );
};

export default InlineLinesTable;
