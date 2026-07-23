import React, { useEffect, useState } from 'react';
import {
  Modal, Row, Col, Card, Select, InputNumber, Button, Typography,
  Space, Tag, Divider, Tooltip, Checkbox, Alert, notification
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { buildLotLabel, getAssignmentSummary } from './orderFormHelpers';

const { Option } = Select;
const { Text } = Typography;

const AssignInventoryModal = ({ open, detail, allLots, onClose, onSubmit, onRelease }) => {
  const [rows, setRows] = useState([{ lote_id: null, quantity: 0 }]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRows([{ lote_id: null, quantity: 0 }]);
      setShowAllProducts(false);
    }
  }, [open, detail]);

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const { total, assigned, pending } = detail ? getAssignmentSummary(detail) : { total: 0, assigned: 0, pending: 0 };
  const newAssignmentSum = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const detailFullName = detail
    ? `${detail.product?.name || ''} ${(detail.variant || detail.lote?.variant)?.attributes?.map(a => a.value?.value).join(' ') || ''}`.trim()
    : '';

  const modalLots = detail
    ? allLots.filter(l => {
      if (Number(l.cantidad_disponible) <= 0) return false;
      if (showAllProducts) return true;
      const sameProduct = String(l.product_id) === String(detail.product_id);
      const detailVariantId = detail.variant_id || detail.lote?.variant_id || null;
      const sameVariant = detailVariantId ? String(l.variant_id) === String(detailVariantId) : true;
      return sameProduct && sameVariant;
    })
    : [];

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.lote_id && Number(r.quantity) > 0);
    if (validRows.length === 0) { notification.error({ message: 'Agrega al menos una asignación válida' }); return; }
    setSubmitting(true);
    try {
      await onSubmit(validRows);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseExisting = (assignmentId) => {
    onRelease(assignmentId);
    onClose();
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <span>Asignar Inventario</span>
          {detail && (
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Línea #{detail.line_number} : {detailFullName} | {detail.packaging_type}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button
          key="submit"
          type="primary"
          style={{ backgroundColor: '#1a3c2e' }}
          loading={submitting}
          onClick={handleSubmit}
          disabled={newAssignmentSum > pending}
        >
          Confirmar Asignación
        </Button>
      ]}
    >
      {detail && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                <Text type="secondary">Total línea</Text>
                <div><Text strong style={{ fontSize: 18 }}>{total}</Text> <Text type="secondary">tallos</Text></div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center', backgroundColor: '#f6ffed' }}>
                <Text type="secondary">Ya asignado</Text>
                <div><Text strong style={{ fontSize: 18, color: '#52c41a' }}>{assigned}</Text> <Text type="secondary">tallos</Text></div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ textAlign: 'center', backgroundColor: '#fff7e6' }}>
                <Text type="secondary">Pendiente</Text>
                <div><Text strong style={{ fontSize: 18, color: '#faad14' }}>{pending}</Text> <Text type="secondary">tallos</Text></div>
              </Card>
            </Col>
          </Row>

          {detail.assignments && detail.assignments.length > 0 && (
            <>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Asignaciones existentes</Text>
              {detail.assignments.map(a => (
                <Row key={a.assignment_id} gutter={8} align="middle" style={{ marginBottom: 6 }}>
                  <Col><Tag color="green">{a.lote?.numero_lote || a.lote_id}</Tag></Col>
                  <Col><Text>{a.quantity} tallos</Text></Col>
                  <Col>
                    <Tooltip title="Liberar">
                      <MinusCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }}
                        onClick={() => handleReleaseExisting(a.assignment_id)} />
                    </Tooltip>
                  </Col>
                </Row>
              ))}
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}

          <Checkbox
            checked={showAllProducts}
            onChange={(e) => setShowAllProducts(e.target.checked)}
            style={{ marginBottom: 8 }}
          >
            Ver todos los productos
          </Checkbox>

          <Text strong style={{ display: 'block', marginBottom: 8 }}>Nueva asignación</Text>
          {rows.map((row, idx) => (
            <Row key={idx} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col flex="1">
                <Select showSearch placeholder="Seleccionar lote" style={{ width: '100%' }} value={row.lote_id}
                  onChange={val => updateRow(idx, 'lote_id', val)}
                  filterOption={(i, o) => o.children?.toString().toLowerCase().includes(i.toLowerCase())}
                >
                  {modalLots.map(l => (
                    <Option key={l.lote_id} value={l.lote_id}>{buildLotLabel(l).label} | {l.cantidad_disponible} disp.</Option>
                  ))}
                </Select>
              </Col>
              <Col>
                <InputNumber min={1} max={pending} placeholder="Cantidad" value={row.quantity || undefined}
                  onChange={val => updateRow(idx, 'quantity', val)} addonAfter="t" style={{ width: 130 }} />
              </Col>
              <Col>
                <Button type="text" danger icon={<MinusCircleOutlined />} disabled={rows.length === 1}
                  onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} />
              </Col>
            </Row>
          ))}

          <Button type="dashed" icon={<PlusOutlined />}
            onClick={() => setRows(prev => [...prev, { lote_id: null, quantity: 0 }])}
            style={{ width: '100%', marginTop: 4 }} disabled={newAssignmentSum >= pending}>
            Agregar otro lote
          </Button>

          {newAssignmentSum > 0 && (
            <Alert style={{ marginTop: 12 }} type={newAssignmentSum > pending ? 'error' : 'success'}
              message={`Asignando ${newAssignmentSum} de ${pending} tallos pendientes`} showIcon />
          )}
        </>
      )}
    </Modal>
  );
};

export default AssignInventoryModal;
