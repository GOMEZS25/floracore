import React, { useState } from 'react';
import { Modal, Table, Button, Space, Typography, notification } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import salesService from '../../../services/salesService';
import { formatOrderNumber } from '../../../utils/orderNumber';

const { Text } = Typography;

const normalizeUnidad = (unidad) => {
  if (!unidad) return 'tallos';
  const up = unidad.toUpperCase();
  if (up === 'TALLO' || up.includes('TALLO')) return 'tallos';
  if (up === 'RAMO' || up.includes('RAMO')) return 'ramos';
  if (up === 'CAJA' || up.includes('CAJA')) return 'cajas';
  return 'tallos';
};

const ReservationsModal = ({ open, reservations, loading, onClose, onRemoved, onSuccess }) => {
  const [confirmingDetailId, setConfirmingDetailId] = useState(null);

  const handleConfirmRemoveReservation = async (record) => {
    try {
      await salesService.eliminarLinea(record.detail_id);
      notification.success({
        message: 'Reserva quitada',
        description: 'La reserva ha sido eliminada exitosamente y las unidades han retornado al inventario disponible.'
      });
      onRemoved(record.detail_id);
      setConfirmingDetailId(null);
      onSuccess();
    } catch (error) {
      notification.error({
        message: 'Error al quitar reserva',
        description: error.response?.data?.mensaje || 'No se pudo eliminar la reserva.'
      });
    }
  };

  const reservationsColumns = [
    {
      title: 'Lote',
      dataIndex: ['lote', 'numero_lote'],
      key: 'lote',
      render: (text, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            children: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: '600', color: '#d9363e' }}>¿Confirmar quitar reserva?</span>
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    style={{ backgroundColor: '#389e0d', borderColor: '#389e0d' }}
                    onClick={() => handleConfirmRemoveReservation(record)}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setConfirmingDetailId(null)}
                  >
                    Cancelar
                  </Button>
                </Space>
              </div>
            ),
            props: {
              colSpan: 7,
            },
          };
        }
        return <Text strong>{text || record.lote?.numero_lote}</Text>;
      }
    },
    {
      title: 'Producto',
      key: 'product',
      render: (_, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            props: {
              colSpan: 0,
            },
          };
        }
        const pName = record.product?.name || '';
        const attrStr = record.lote?.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
        const fullName = `${pName} ${attrStr}`.trim();
        return <Text>{fullName}</Text>;
      }
    },
    {
      title: 'Cliente',
      dataIndex: ['order', 'client', 'name'],
      key: 'client',
      render: (text, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            props: {
              colSpan: 0,
            },
          };
        }
        return text || record.order?.client?.name || '-';
      }
    },
    {
      title: 'N° Venta',
      dataIndex: ['order', 'order_number'],
      key: 'order_number',
      render: (text, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            props: {
              colSpan: 0,
            },
          };
        }
        const num = text || record.order?.order_number;
        return num ? formatOrderNumber(num) : '-';
      }
    },
    {
      title: 'Fecha Despacho',
      dataIndex: ['order', 'delivery_date'],
      key: 'delivery_date',
      render: (val, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            props: {
              colSpan: 0,
            },
          };
        }
        const dateVal = val || record.order?.delivery_date;
        return dateVal
          ? new Date(dateVal).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : '-';
      }
    },
    {
      title: 'Total Reservado',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            props: {
              colSpan: 0,
            },
          };
        }
        const suf = normalizeUnidad(record.lote?.unidad_medida);
        return <Text strong>{val} {suf}</Text>;
      }
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => {
        if (confirmingDetailId === record.detail_id) {
          return {
            props: {
              colSpan: 0,
            },
          };
        }
        return (
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setConfirmingDetailId(record.detail_id)}
          />
        );
      }
    }
  ];

  return (
    <Modal
      title="Reservas activas"
      open={open}
      onCancel={onClose}
      centered
      width={900}
      destroyOnClose
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>
      ]}
    >
      <Table
        columns={reservationsColumns}
        dataSource={reservations}
        rowKey="detail_id"
        pagination={false}
        loading={loading}
        locale={{ emptyText: 'No hay reservas activas para los lotes seleccionados.' }}
      />
    </Modal>
  );
};

export default ReservationsModal;
