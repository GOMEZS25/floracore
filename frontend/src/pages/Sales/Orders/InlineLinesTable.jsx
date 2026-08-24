import React, { useState } from 'react';
import { Card, Table, Select, InputNumber, Button, Tag, Popconfirm, Tooltip, Typography, notification, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import salesService from '../../../services/salesService';
import { getCurrencySymbol, formatMoney } from './orderFormHelpers';

const { Text } = Typography;

const InlineLinesTable = ({ orderId, orderLines, allProducts, clientCurrency, isReadOnly, onLinesChanged }) => {
  const [captureRow, setCaptureRow] = useState({
    product_variant_key: null,
    cantidad_cajas: null,
    ramos_por_caja: null,
    tallos_por_ramo: null,
    unit_price: null,
    billing_unit: 'TALLO',
  });
  const [submitting, setSubmitting] = useState(false);

  const [rowEdits, setRowEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);

  const handleAdd = async () => {
    const { product_variant_key, cantidad_cajas, ramos_por_caja, tallos_por_ramo, unit_price } = captureRow;
    if (!product_variant_key || !cantidad_cajas || !ramos_por_caja || !tallos_por_ramo || !unit_price) {
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
      tallos_por_ramo,
      ramos_por_caja,
      unit_price,
      billing_unit: captureRow.billing_unit,
    };

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
      });
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

  const calcSubtotal = () => {
    const cajas = Number(captureRow.cantidad_cajas) || 0;
    const ramos_caja = Number(captureRow.ramos_por_caja) || 0;
    const tallos_ramo = Number(captureRow.tallos_por_ramo) || 0;
    const price = Number(captureRow.unit_price) || 0;
    const bu = captureRow.billing_unit;

    if (bu === 'TALLO') {
      const total_tallos = cajas * ramos_caja * tallos_ramo;
      return total_tallos * price;
    }
    if (bu === 'RAMO') {
      const total_ramos = cajas * ramos_caja;
      return total_ramos * price;
    }
    if (bu === 'CAJA') {
      return cajas * price;
    }
    return 0;
  };

  const subtotalEstimado = calcSubtotal();
  const totalTallosEstimado =
    (Number(captureRow.cantidad_cajas) || 0) *
    (Number(captureRow.ramos_por_caja) || 0) *
    (Number(captureRow.tallos_por_ramo) || 0);
  const totalRamosEstimado =
    (Number(captureRow.cantidad_cajas) || 0) *
    (Number(captureRow.ramos_por_caja) || 0);

  const getRowValue = (row, field) => {
    const detailId = row.detail_id || row.id;
    if (rowEdits[detailId] && rowEdits[detailId][field] !== undefined) {
      return rowEdits[detailId][field];
    }
    return row[field];
  };

  const isRowDirty = (row) => {
    const detailId = row.detail_id || row.id;
    const edits = rowEdits[detailId];
    if (!edits) return false;
    return Object.keys(edits).some(field => edits[field] !== row[field]);
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
    const payload = {
      packaging_type: row.packaging_type || 'CAJA',
      quantity: edits.quantity !== undefined ? edits.quantity : row.quantity,
      ramos_por_caja: edits.bunches_per_box !== undefined ? edits.bunches_per_box : row.bunches_per_box,
      tallos_por_ramo: edits.stems_per_bunch !== undefined ? edits.stems_per_bunch : row.stems_per_bunch,
      unit_price: edits.unit_price !== undefined ? edits.unit_price : row.unit_price,
      billing_unit: edits.billing_unit !== undefined ? edits.billing_unit : row.billing_unit,
    };

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

  const columns = [
    {
      title: 'PRODUCTO',
      key: 'producto',
      render: (_, r) => {
        const n = r.product?.name || '';
        const a = (r.lote?.variant || r.variant)?.attributes?.map(x => x.value?.value).join(' ') || '';
        return <Text strong>{`${n} ${a}`.trim()}</Text>;
      },
    },
    {
      title: 'TIPO DE CAJA',
      dataIndex: 'packaging_type',
      render: (val) => <Tag>{val || 'CAJA'}</Tag>,
      width: 100,
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
      title: 'RAMOS/CAJA',
      key: 'ramos_caja',
      width: 110,
      align: 'right',
      render: (_, r) => (
        <InputNumber
          min={1}
          size="small"
          value={getRowValue(r, 'bunches_per_box')}
          onChange={(v) => updateRowField(r, 'bunches_per_box', v)}
          disabled={isReadOnly}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'TALLOS/RAMO',
      key: 'tallos_ramo',
      width: 110,
      align: 'right',
      render: (_, r) => (
        <InputNumber
          min={1}
          size="small"
          value={getRowValue(r, 'stems_per_bunch')}
          onChange={(v) => updateRowField(r, 'stems_per_bunch', v)}
          disabled={isReadOnly}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'UNIT PRICE',
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
      title: 'PRICE UNIT',
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
      width: 120,
      render: (_, r) => {
        if (isReadOnly) return null;
        const dirty = isRowDirty(r);
        const detailId = r.detail_id || r.id;
        return (
          <Space size={4}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.2fr 1fr auto', gap: 12, alignItems: 'end', padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>PRODUCTO</span>
            <Select
              showSearch
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
            />
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
            <InputNumber min={1} value={captureRow.ramos_por_caja} onChange={(v) => setCaptureRow(prev => ({ ...prev, ramos_por_caja: v }))} disabled={isReadOnly || !orderId} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>TALLOS/RAMO</span>
            <InputNumber min={1} value={captureRow.tallos_por_ramo} onChange={(v) => setCaptureRow(prev => ({ ...prev, tallos_por_ramo: v }))} disabled={isReadOnly || !orderId} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>UNIT PRICE</span>
            <InputNumber min={0} step={0.01} prefix={getCurrencySymbol(clientCurrency)} value={captureRow.unit_price} onChange={(v) => setCaptureRow(prev => ({ ...prev, unit_price: v }))} disabled={isReadOnly || !orderId} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>PRICE UNIT</span>
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
        scroll={{ x: 1100 }}
        locale={{ emptyText: 'No hay líneas todavía' }}
        rowClassName={(r) => isRowDirty(r) ? 'floracore-row-dirty' : ''}
      />
    </Card>
  );
};

export default InlineLinesTable;
