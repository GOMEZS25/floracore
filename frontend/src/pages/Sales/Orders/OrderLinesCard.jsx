import React from 'react';
import { Card, Table, Row, Col, Space, Tag, Tooltip, Button, Popconfirm, Progress, Typography, Divider } from 'antd';
import { EditOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import { getCurrencySymbol, getAssignmentSummary, formatMoney } from './orderFormHelpers';

const { Text } = Typography;

const OrderLinesCard = ({
  orderLines, isReadOnly, isDraft, isApproved, clientCurrency,
  onEdit, onAssign, onDelete, onViewReservation
}) => {
  const totalAmount = orderLines.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
  const totalTallos = orderLines.reduce((acc, l) => acc + (Number(l.total_stems) || 0), 0);
  const totalAsignados = orderLines.reduce((acc, l) => acc + getAssignmentSummary(l).assigned, 0);

  const detailColumns = [
    {
      title: '#',
      dataIndex: 'line_number',
      width: 40,
      render: (val, _, idx) => val || idx + 1
    },
    {
      title: 'Producto',
      key: 'producto',
      width: 220,
      render: (_, r) => {
        const n = r.product?.name || '';
        const a = (r.lote?.variant || r.variant)
          ?.attributes?.map(x => x.value?.value).join(' ') || '';
        return <Text strong>{`${n} ${a}`.trim()}</Text>;
      }
    },
    {
      title: 'Empaque',
      dataIndex: 'packaging_type',
      width: 80,
      render: (val) => {
        const labels = { TALLO: 'Tallo', RAMO: 'Ramo', CAJA: 'Caja' };
        return <Tag>{labels[val] || val}</Tag>;
      }
    },
    {
      title: 'Total',
      key: 'total',
      width: 90,
      render: (_, r) => {
        const { total } = getAssignmentSummary(r);
        return <Text>{total} tallos</Text>;
      }
    },
    {
      title: 'Reservado',
      key: 'reservado',
      width: 150,
      render: (_, r) => {
        const { assigned, total } = getAssignmentSummary(r);
        const percent = total > 0 ? Math.round((assigned / total) * 100) : 0;
        const complete = total > 0 && assigned >= total;
        return (
          <Space direction="vertical" size={0}>
            <Space size={8} align="center">
              <Text>{assigned} tallos</Text>
              <Progress
                percent={percent}
                size="small"
                showInfo={false}
                strokeColor={complete ? '#52c41a' : 'var(--fc-accent)'}
                style={{ width: 50 }}
              />
            </Space>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: 'auto', fontSize: 12 }}
              onClick={() => onViewReservation(r)}
            >
              Ver reserva
            </Button>
          </Space>
        );
      }
    },
    {
      title: 'Precio unit.',
      key: 'up',
      width: 140,
      align: 'right',
      render: (_, r) => `${getCurrencySymbol(clientCurrency)} ${formatMoney(r.unit_price)} / ${(r.billing_unit || r.packaging_type || 'TALLO').toLowerCase()}`
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      width: 130,
      align: 'right',
      render: (v) => <Text strong>{getCurrencySymbol(clientCurrency)} {formatMoney(v)}</Text>
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_, r) => {
        if (isReadOnly) return null;
        const { assigned, total } = getAssignmentSummary(r);
        const canAssignMore = assigned < total;
        return (
          <Space size={6}>
            {(isDraft || isApproved) && (
              <Tooltip title="Editar línea">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  style={{ borderColor: '#8c8c8c', color: '#8c8c8c' }}
                  onClick={() => onEdit(r)}
                />
              </Tooltip>
            )}
            {isDraft && canAssignMore && (
              <Tooltip title="Asignar inventario">
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  style={{ borderColor: 'var(--fc-accent)', color: 'var(--fc-accent)' }}
                  onClick={() => onAssign(r)}
                />
              </Tooltip>
            )}
            {isDraft && (
              <Popconfirm title="¿Eliminar línea?" onConfirm={() => onDelete(r.detail_id || r.id)}>
                <Tooltip title="Eliminar línea">
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  const summaryLabelStyle = { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8c8c8c' };

  return (
    <Card
      title="Líneas de la Orden"
      variant="borderless"
      style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      styles={{ header: { border: 'none' }, body: { paddingTop: 8 } }}
    >
      <Table
        columns={detailColumns}
        dataSource={orderLines}
        rowKey={(r) => r.detail_id || r.id}
        pagination={false}
        scroll={{ x: 900 }}
        locale={{ emptyText: 'No hay líneas.' }}
      />
      <Divider style={{ margin: '16px 0' }} />
      <Row justify="space-between" align="middle" wrap gutter={[16, 12]}>
        <Col>
          <Space size={32}>
            <Space direction="vertical" size={0}>
              <Text style={summaryLabelStyle}>Tallos totales</Text>
              <Text strong style={{ fontSize: 16 }}>{totalTallos}</Text>
            </Space>
            <Space direction="vertical" size={0}>
              <Text style={summaryLabelStyle}>Asignados</Text>
              <Text strong style={{ fontSize: 16, color: totalAsignados === totalTallos && totalTallos > 0 ? '#52c41a' : '#faad14' }}>
                {totalAsignados}
              </Text>
            </Space>
          </Space>
        </Col>
        <Col style={{ textAlign: 'right' }}>
          <Space direction="vertical" size={0}>
            <Text style={summaryLabelStyle}>Total</Text>
            <Text strong style={{ fontSize: 20, color: 'var(--fc-accent)' }}>
              {getCurrencySymbol(clientCurrency)} {formatMoney(totalAmount)}
            </Text>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default OrderLinesCard;
