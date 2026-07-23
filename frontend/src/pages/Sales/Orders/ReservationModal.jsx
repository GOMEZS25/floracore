import React from 'react';
import { Modal, Row, Col, Card, Table, Tag, Typography, Space, Tooltip, Button } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import { getAssignmentSummary } from './orderFormHelpers';

const { Text } = Typography;

const ReservationModal = ({ detail, onClose, isDraft, onRelease }) => {
  const open = !!detail;
  const summary = detail ? getAssignmentSummary(detail) : { total: 0, assigned: 0, pending: 0 };
  const { assigned, total, pending } = summary;

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <span>Reserva de Inventario</span>
          {detail && (
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Línea #{detail.line_number} : {detail.product?.name}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={620}
      footer={[
        <Button key="close" onClick={onClose}>Cerrar</Button>
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
                <Text type="secondary">Reservado</Text>
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

          {(!detail.assignments || detail.assignments.length === 0) ? (
            <Text type="secondary">Sin lotes asignados todavía.</Text>
          ) : (
            <Table
              size="small"
              pagination={false}
              dataSource={detail.assignments}
              rowKey={a => a.assignment_id}
              columns={[
                {
                  title: 'Lote',
                  key: 'lote',
                  render: (_, a) => <Tag color="green">{a.lote?.numero_lote || a.lote_id}</Tag>
                },
                {
                  title: 'Asignado',
                  key: 'asignado',
                  render: (_, a) => `${a.quantity} tallos`
                },
                {
                  title: 'Disponible en el lote',
                  key: 'disponible',
                  render: (_, a) => a.lote?.cantidad_disponible != null ? `${a.lote.cantidad_disponible} tallos` : '-'
                },
                ...(isDraft ? [{
                  title: '',
                  key: 'liberar',
                  width: 50,
                  render: (_, a) => (
                    <Tooltip title="Liberar asignación">
                      <MinusCircleOutlined
                        style={{ color: '#ff4d4f', cursor: 'pointer' }}
                        onClick={() => onRelease(a.assignment_id)}
                      />
                    </Tooltip>
                  )
                }] : [])
              ]}
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default ReservationModal;
