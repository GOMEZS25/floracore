import React, { useState } from 'react';
import { Card, Table, Select, InputNumber, Button, Tag, Popconfirm, Tooltip, Typography, notification } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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
      dataIndex: 'total_boxes',
      render: (v, r) => v ?? (r.packaging_type === 'CAJA' ? r.quantity : '—'),
      width: 80,
      align: 'right',
    },
    {
      title: 'RAMOS/CAJA',
      dataIndex: 'bunches_per_box',
      render: (v) => (v != null ? v : '—'),
      width: 100,
      align: 'right',
    },
    {
      title: 'TALLOS/RAMO',
      dataIndex: 'stems_per_bunch',
      render: (v) => (v != null ? v : '—'),
      width: 100,
      align: 'right',
    },
    {
      title: 'UNIT PRICE',
      key: 'unit_price',
      render: (_, r) => `${getCurrencySymbol(clientCurrency)} ${formatMoney(r.unit_price)}`,
      width: 120,
      align: 'right',
    },
    {
      title: 'PRICE UNIT',
      key: 'price_unit',
      render: (_, r) => (r.billing_unit || 'CAJA').toUpperCase(),
      width: 90,
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
      width: 60,
      render: (_, r) => isReadOnly ? null : (
        <Popconfirm
          title="¿Eliminar línea?"
          onConfirm={async () => {
            try {
              await salesService.eliminarLinea(r.detail_id || r.id);
              notification.success({ message: 'Línea eliminada' });
              onLinesChanged();
            } catch (e) {
              notification.error({ message: 'Error al eliminar' });
            }
          }}
        >
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
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
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'var(--fc-accent-soft)',
          border: '1px solid var(--fc-accent)',
          borderRadius: 8,
          padding: '10px 14px',
          marginTop: 8,
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--fc-accent)', fontWeight: 600 }}>→</span>
          <span style={{ color: 'var(--fc-text-primary)' }}>
            <strong>{totalTallosEstimado.toLocaleString('es-CO')} tallos</strong>
            &nbsp;·&nbsp;Subtotal estimado:{' '}
            <strong>
              {getCurrencySymbol(clientCurrency)} {formatMoney(subtotalEstimado)}
            </strong>
          </span>
        </div>
      )}

      <div style={{ height: 1, backgroundColor: 'var(--fc-border)', margin: '12px 0' }} />

      <Table
        columns={columns}
        dataSource={orderLines}
        rowKey={r => r.detail_id || r.id}
        pagination={false}
        scroll={{ x: 1100 }}
        locale={{ emptyText: 'No hay líneas todavía' }}
      />
    </Card>
  );
};

export default InlineLinesTable;
