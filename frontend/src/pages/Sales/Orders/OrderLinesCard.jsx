import React from 'react';
import { Card, Table, Row, Col, Space, Tag, Tooltip, Button, Popconfirm, Progress, Typography } from 'antd';
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
                strokeColor={complete ? '#52c41a' : '#1a3c2e'}
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
      render: (_, r) => `${getCurrencySymbol(clientCurrency)} ${formatMoney(r.unit_price)} / ${(r.billing_unit || r.packaging_type || 'TALLO').toLowerCase()}`
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      width: 130,
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
                  style={{ borderColor: '#1a3c2e', color: '#1a3c2e' }}
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

  return (
    <Card title="Líneas de la Orden" style={{ borderRadius: 8, overflow: 'hidden' }}>
      <Table
        columns={detailColumns}
        dataSource={orderLines}
        rowKey={(r) => r.detail_id || r.id}
        pagination={false}
        scroll={{ x: 900 }}
        locale={{ emptyText: 'No hay líneas.' }}
      />
      <Row justify="space-between" align="middle" style={{ marginTop: 16 }}>
        <Col>
          <Space>
            <Text type="secondary">Tallos totales: <Text strong>{totalTallos}</Text></Text>
            <Text type="secondary">
              Asignados: <Text strong style={{ color: totalAsignados === totalTallos && totalTallos > 0 ? '#52c41a' : '#faad14' }}>{totalAsignados}</Text>
            </Text>
          </Space>
        </Col>
        <Col>
          <Text strong style={{ fontSize: 18 }}>
            Total: {getCurrencySymbol(clientCurrency)} {formatMoney(totalAmount)}
          </Text>
        </Col>
      </Row>
    </Card>
  );
};

export default OrderLinesCard;
