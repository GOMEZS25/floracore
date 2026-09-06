import React, { useState } from 'react';
import { Modal, Select, InputNumber, Button, Table, Typography, Space, notification } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Etiqueta legible de una variante a partir de sus atributos.
export const buildVariantLabel = (variant) =>
  variant?.attributes?.map(a => a.value?.value).filter(Boolean).join(' ') || '';

// Normaliza los `components` que devuelve el GET de la orden al shape que
// maneja este modal (ids como string + campos de display).
export const mapServerComponents = (serverComponents) =>
  (serverComponents || []).map(c => ({
    component_product_id: String(c.component_product_id),
    component_variant_id: c.component_variant_id != null ? String(c.component_variant_id) : null,
    bunches: Number(c.bunches),
    stems_per_bunch: Number(c.stems_per_bunch),
    product_name: c.component_product?.name || c.product_name_snapshot || '',
    variant_label: buildVariantLabel(c.component_variant),
  }));

// Deja solo los campos que el backend espera, sin los de display.
export const toPayloadComponents = (components) =>
  (components || []).map(c => ({
    component_product_id: c.component_product_id,
    component_variant_id: c.component_variant_id,
    bunches: Number(c.bunches),
    stems_per_bunch: Number(c.stems_per_bunch),
  }));

export const sumBunches = (components) =>
  (components || []).reduce((acc, c) => acc + Number(c.bunches || 0), 0);

export const sumStems = (components) =>
  (components || []).reduce((acc, c) => acc + Number(c.bunches || 0) * Number(c.stems_per_bunch || 0), 0);

const labelStyle = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  color: 'var(--fc-text-secondary)',
  fontWeight: 500,
};

/**
 * Armador del surtido de UNA caja. El estado vive aquí mientras el modal está
 * abierto y se entrega al padre en onSave; el padre es quien lo persiste al
 * agregar o guardar la línea.
 */
const AssortmentModal = ({ open, onCancel, onSave, initialComponents, allProducts, isReadOnly }) => {
  const [rows, setRows] = useState(initialComponents || []);

  const [draftKey, setDraftKey] = useState(null);
  const [draftBunches, setDraftBunches] = useState(null);
  const [draftStems, setDraftStems] = useState(null);

  // Un componente siempre necesita variante, así que la lista se arma
  // directamente sobre las variantes; los productos sin variantes quedan fuera.
  // La etiqueta lleva el nombre completo "producto + atributos", igual que el
  // Select de producto de la barra de captura.
  const variantOptions = (allProducts || [])
    .filter(p => p.variants && p.variants.length > 0)
    .flatMap(p =>
      p.variants.map(v => {
        const attrStr = buildVariantLabel(v);
        return {
          value: `${p.product_id}_${v.variant_id}`,
          label: attrStr ? `${p.name} ${attrStr}` : p.name,
          product_id: String(p.product_id),
          variant_id: String(v.variant_id),
          product_name: p.name,
          variant_label: attrStr,
        };
      })
    );

  const resetDraft = () => {
    setDraftKey(null);
    setDraftBunches(null);
    setDraftStems(null);
  };

  const handleAddComponent = () => {
    const option = variantOptions.find(o => o.value === draftKey);
    if (!option) {
      notification.error({ message: 'Elige una variante' });
      return;
    }
    if (!draftBunches || draftBunches <= 0 || !draftStems || draftStems <= 0) {
      notification.error({ message: 'Ramos y tallos/ramo deben ser mayores a 0' });
      return;
    }

    setRows(prev => [
      ...prev,
      {
        component_product_id: option.product_id,
        component_variant_id: option.variant_id,
        bunches: Number(draftBunches),
        stems_per_bunch: Number(draftStems),
        product_name: option.product_name,
        variant_label: option.variant_label,
      },
    ]);
    resetDraft();
  };

  const handleRemoveComponent = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Guardar sin componentes deja la línea como caja normal (así se quita un
  // surtido existente).
  const handleSave = () => {
    onSave(rows);
  };

  const totalBunches = sumBunches(rows);
  const totalStems = sumStems(rows);

  const columns = [
    {
      title: 'PRODUCTO',
      key: 'producto',
      render: (_, r) => <Text strong>{r.product_name || '—'}</Text>,
    },
    {
      title: 'VARIANTE',
      key: 'variante',
      render: (_, r) => r.variant_label || <Text type="secondary">—</Text>,
    },
    {
      title: 'RAMOS',
      dataIndex: 'bunches',
      width: 90,
      align: 'right',
    },
    {
      title: 'TALLOS/RAMO',
      dataIndex: 'stems_per_bunch',
      width: 110,
      align: 'right',
    },
    {
      title: 'TALLOS',
      key: 'tallos',
      width: 90,
      align: 'right',
      render: (_, r) => (
        <Text strong>{(Number(r.bunches) * Number(r.stems_per_bunch)).toLocaleString('es-CO')}</Text>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_, __, index) =>
        isReadOnly ? null : (
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveComponent(index)}
          />
        ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width={860}
      title="Surtido de la caja"
      footer={
        isReadOnly
          ? [<Button key="close" onClick={onCancel}>Cerrar</Button>]
          : [
              <Button key="cancel" onClick={onCancel}>Cancelar</Button>,
              <Button key="save" type="primary" onClick={handleSave}>Guardar</Button>,
            ]
      }
    >
      {!isReadOnly && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: 12,
            alignItems: 'end',
            padding: '4px 0 16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>VARIANTE</span>
            <Select
              showSearch
              popupMatchSelectWidth={false}
              placeholder="Buscar variante..."
              value={draftKey}
              onChange={(val) => setDraftKey(val)}
              filterOption={(input, option) =>
                option?.label?.toString().toLowerCase().includes(input.toLowerCase())
              }
              options={variantOptions}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>RAMOS</span>
            <InputNumber
              min={1}
              precision={0}
              value={draftBunches}
              onChange={(v) => setDraftBunches(v)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>TALLOS/RAMO</span>
            <InputNumber
              min={1}
              precision={0}
              value={draftStems}
              onChange={(v) => setDraftStems(v)}
              style={{ width: '100%' }}
            />
          </div>

          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddComponent}>
            Agregar componente
          </Button>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={rows}
        rowKey={(_, index) => index}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Sin componentes todavía' }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <Space size={8}>
          <span style={{ ...labelStyle, fontSize: 10 }}>Ramos/caja</span>
          <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
            {totalBunches.toLocaleString('es-CO')}
          </Text>
          <span style={{ color: 'var(--fc-border)' }}>|</span>
          <span style={{ ...labelStyle, fontSize: 10, color: 'var(--fc-accent)' }}>Tallos/caja</span>
          <Text strong style={{ color: 'var(--fc-accent)', fontVariantNumeric: 'tabular-nums' }}>
            {totalStems.toLocaleString('es-CO')}
          </Text>
        </Space>
      </div>
    </Modal>
  );
};

export default AssortmentModal;
