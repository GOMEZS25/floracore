import React, { useState, useEffect, useRef } from 'react';
import {
  Form, Select, DatePicker, Input, Button,
  Typography, Row, Col, Card, Spin, notification, Popconfirm, Modal,
  Space, Tag
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined,
  CheckCircleOutlined, CarOutlined, CloseCircleOutlined, RollbackOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import salesService from '../../../services/salesService';
import clientService from '../../../services/clientService';
import lotService from '../../../services/lotService';
import * as productService from '../../../services/productService';
import ReservationModal from './ReservationModal';
import EditLineModal from './EditLineModal';
import AssignInventoryModal from './AssignInventoryModal';
import AddProductsCard from './AddProductsCard';
import OrderLinesCard from './OrderLinesCard';
import { formatOrderNumber } from '../../../utils/orderNumber';
import './SalesOrderForm.css';

const { Option } = Select;
const { Title } = Typography;
const { TextArea } = Input;

const STATUS_TAG = {
  BORRADOR: { color: 'warning', text: 'BORRADOR' },
  APROBADA: { color: 'processing', text: 'APROBADA' },
  DESPACHADA: { color: 'success', text: 'DESPACHADA' },
  CANCELADA: { color: 'error', text: 'CANCELADA' }
};

const SalesOrderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [headerForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(id || null);
  const [orderData, setOrderData] = useState(null);
  const [clientCurrency, setClientCurrency] = useState('COP');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningDetail, setAssigningDetail] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);

  const [reservationDetailId, setReservationDetailId] = useState(null);

  const [clients, setClients] = useState([]);
  const [clientAddresses, setClientAddresses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [allLots, setAllLots] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const autoSaved = useRef(!!id);
  const headerUpdateTimer = useRef(null);

  useEffect(() => {
    fetchInitialData();
    if (id) fetchOrder(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refreshAvailableLots = async () => {
    const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
    setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [clientsRes, lotsRes, catRes, prodRes] = await Promise.all([
        clientService.getClients({ is_active: 'true' }).catch(() => ({ data: [] })),
        lotService.getLots({ estado: 'DISPONIBLE' }).catch(() => ({ data: [] })),
        salesService.getTransactionCategories().catch(() => ({ data: [] })),
        productService.getProducts({ is_active: 'true' }).catch(() => [])
      ]);
      setClients(clientsRes?.data?.data || clientsRes?.data || []);
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);

      const lots = lotsRes?.data?.data || lotsRes?.data || lotsRes || [];

      setCategories(catRes?.data?.data || catRes?.data || catRes || []);
      setAllProducts(prodRes?.data?.data || prodRes?.data || prodRes || []);
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los datos auxiliares.' });
    } finally {
      if (!id) setLoading(false);
    }
  };

  const fetchOrder = async (oid) => {
    setLoading(true);
    try {
      const res = await salesService.obtenerOrden(oid);
      const data = res?.data?.data || res?.data || res;
      setOrderData(data);
      setOrderId(data.order_id || data.id || data.sales_order_id);

      headerForm.setFieldsValue({
        client_id: data.client_id,
        delivery_date: data.delivery_date ? dayjs(data.delivery_date) : null,
        transaction_category_id: data.transaction_category_id,
        notes: data.notes,
      });

      const clientRes = await clientService.getClientById(data.client_id);
      const clientInfo = clientRes?.data?.data || clientRes?.data || clientRes;
      if (clientInfo) {
        if (clientInfo.addresses) {
          setClientAddresses(clientInfo.addresses.filter(a => a.is_active !== false));
        }
        setClientCurrency(clientInfo.currency || 'COP');
      }
      headerForm.setFieldsValue({ client_address_id: data.client_address_id });
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudo cargar la orden.' });
      navigate('/sales/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId) => {
    headerForm.setFieldsValue({ client_address_id: undefined });
    setClientAddresses([]);
    if (!clientId) return;
    try {
      const res = await clientService.getClientById(clientId);
      const clientInfo = res?.data?.data || res?.data || res;
      if (clientInfo) {
        setClientCurrency(clientInfo.currency || 'COP');
        if (clientInfo.addresses) {
          const addrs = clientInfo.addresses.filter(a => a.is_active !== false);
          setClientAddresses(addrs);
          if (addrs.length > 0) {
            headerForm.setFieldsValue({ client_address_id: addrs[0].address_id });
          }
        }
      }
    } catch (error) {
      notification.error({ message: 'Error', description: 'Error al cargar direcciones.' });
    }
  };

  const isReadOnly = orderData?.status === 'CANCELADA';

  const headerVals = Form.useWatch([], headerForm) || {};

  useEffect(() => {
    if (orderId) {
      if (isReadOnly || !orderData) return;
      if (headerUpdateTimer.current) clearTimeout(headerUpdateTimer.current);
      headerUpdateTimer.current = setTimeout(() => {
        if (headerVals.client_id && headerVals.client_address_id && headerVals.delivery_date) {
          const payload = {
            client_id: headerVals.client_id,
            client_address_id: headerVals.client_address_id,
            delivery_date: headerVals.delivery_date.format('YYYY-MM-DD'),
            transaction_category_id: headerVals.transaction_category_id || null,
            notes: headerVals.notes
          };
          salesService.actualizarHeader(orderId, payload).catch(() => { });
        }
      }, 800);
      return () => clearTimeout(headerUpdateTimer.current);
    } else {
      if (autoSaved.current) return;
      if (headerVals.client_id && headerVals.client_address_id && headerVals.delivery_date) {
        autoSaved.current = true;
        const payload = {
          ...headerVals,
          delivery_date: headerVals.delivery_date.format('YYYY-MM-DD')
        };
        salesService.autoGuardarOrden(payload)
          .then(res => {
            const newId = res?.data?.data?.order_id || res?.data?.data?.id || res?.data?.data?.sales_order_id || res?.data?.sales_order_id || res?.data?.order_id;
            setOrderId(newId);
            setOrderData(res?.data || res?.data?.data);
            notification.success({ message: 'Borrador auto-guardado' });
            navigate(`/sales/orders/${newId}`, { replace: true });
          })
          .catch(() => { autoSaved.current = false; });
      }
    }
  }, [headerVals.client_id, headerVals.client_address_id, headerVals.delivery_date, headerVals.transaction_category_id, headerVals.notes, orderId, isReadOnly, orderData, navigate]);

  const handleLineAdded = () => {
    fetchOrder(orderId);
    refreshAvailableLots();
  };

  const handleDeleteLine = async (detailId) => {
    setLoading(true);
    try {
      await salesService.eliminarLinea(detailId);
      notification.success({ message: 'Línea eliminada.' });
      fetchOrder(orderId);
      refreshAvailableLots();
    } catch (error) {
      notification.error({ message: 'Error al eliminar', description: error.response?.data?.mensaje || 'No se pudo eliminar la línea.' });
      setLoading(false);
    }
  };

  const STATUS_CHANGE_SUCCESS = {
    APROBADA: 'Orden aprobada con éxito',
    DESPACHADA: 'Orden despachada con éxito',
    CANCELADA: 'Orden cancelada',
    BORRADOR: 'Orden devuelta a borrador',
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      setLoading(true);
      await salesService.cambiarEstadoOrden(orderId, newStatus);
      notification.success({ message: STATUS_CHANGE_SUCCESS[newStatus] || 'Estado actualizado' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'No se pudo actualizar el estado de la orden.' });
      setLoading(false);
    }
  };

  const handleDispatchClick = () => {
    const hasAnyAssignment = orderLines.some(l => (l.assignments || []).length > 0);
    if (hasAnyAssignment) {
      handleChangeStatus('DESPACHADA');
      return;
    }
    Modal.confirm({
      title: 'Despachar sin inventario asignado',
      icon: <ExclamationCircleOutlined />,
      content: 'Esta orden no tiene lotes asignados a sus líneas. Se despachará sin afectar el inventario. ¿Deseas continuar?',
      okText: 'Sí, despachar',
      cancelText: 'Cancelar',
      onOk: () => handleChangeStatus('DESPACHADA'),
    });
  };

  const handleCancelDespachadaClick = () => {
    Modal.confirm({
      title: '¿Cancelar una orden ya despachada?',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'Esta orden ya fue despachada. Al cancelarla, el inventario reservado en sus líneas se devolverá a disponible. Esta acción no se puede deshacer.',
      okText: 'Sí, cancelar orden',
      okType: 'danger',
      cancelText: 'Volver',
      onOk: () => handleChangeStatus('CANCELADA'),
    });
  };

  const openAssignModal = (detail) => {
    setAssigningDetail(detail);
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningDetail(null);
  };

  const openEditLineModal = (detail) => {
    setEditingDetail(detail);
    setEditModalOpen(true);
  };

  const handleEditLineSubmit = async (values) => {
    const pt = values.packaging_type;
    const quantity = pt === 'TALLO' ? values.quantity : pt === 'RAMO' ? values.cantidad_ramos : values.cantidad_cajas;

    const payload = {
      packaging_type: pt,
      quantity,
      tallos_por_ramo: pt !== 'TALLO' ? values.tallos_por_ramo : undefined,
      ramos_por_caja: pt === 'CAJA' ? values.ramos_por_caja : undefined,
      unit_price: values.unit_price,
      billing_unit: values.billing_unit,
    };

    setLoading(true);
    try {
      await salesService.actualizarLinea(editingDetail.detail_id, payload);
      notification.success({ message: 'Línea actualizada.' });
      setEditModalOpen(false);
      fetchOrder(orderId);
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'Error al actualizar línea.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async (validRows) => {
    if (!assigningDetail) return;
    try {
      await salesService.asignarInventario(assigningDetail.detail_id, validRows);
      notification.success({ message: 'Inventario asignado exitosamente' });
      closeAssignModal();
      fetchOrder(orderId);
      refreshAvailableLots();
    } catch (error) {
      notification.error({ message: 'Error al asignar', description: error.response?.data?.mensaje || 'No se pudo asignar el inventario.' });
    }
  };

  const handleReleaseAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      await salesService.liberarAsignacion(assignmentId);
      notification.success({ message: 'Asignación liberada' });
      fetchOrder(orderId);
      refreshAvailableLots();
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'No se pudo liberar la asignación.' });
      setLoading(false);
    }
  };

  const orderLines = orderData?.details || [];
  const status = orderData?.status;
  const isDraft = status === 'BORRADOR';
  const isApproved = status === 'APROBADA';

  const reservationDetail = reservationDetailId
    ? orderLines.find(r => (r.detail_id || r.id) === reservationDetailId) || null
    : null;
  const openReservationModal = (detail) => setReservationDetailId(detail.detail_id || detail.id);
  const closeReservationModal = () => setReservationDetailId(null);

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px' }}>

        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space size={16} align="center">
              <Button type="default" icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/orders')}>Volver</Button>
              <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
                {orderData ? `Orden ${formatOrderNumber(orderData.order_number)}` : 'Nueva Orden'}
              </Title>
            </Space>
          </Col>
          <Col>
            <Button icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')} style={{ color: '#8c8c8c', borderColor: '#8c8c8c' }}>
              Nueva Orden
            </Button>
          </Col>
        </Row>

        <Card
          title={
            <Space size={10} align="center">
              <span>Datos Generales</span>
              {status && STATUS_TAG[status] && (
                <Tag color={STATUS_TAG[status].color} style={{ fontSize: 13, padding: '2px 10px', fontWeight: 600, margin: 0 }}>
                  {STATUS_TAG[status].text}
                </Tag>
              )}
            </Space>
          }
          extra={
            orderId && (
              <Space size={12} align="center">
                {status === 'BORRADOR' && orderLines.length > 0 && (
                  <Button icon={<CheckCircleOutlined />} type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={() => handleChangeStatus('APROBADA')}>Aprobar</Button>
                )}
                {status === 'APROBADA' && (
                  <Button icon={<RollbackOutlined />} style={{ color: '#8c8c8c', borderColor: '#8c8c8c' }} onClick={() => handleChangeStatus('BORRADOR')}>Devolver a Borrador</Button>
                )}
                {status === 'APROBADA' && (
                  <Button icon={<CarOutlined />} type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={handleDispatchClick}>Despachar</Button>
                )}
                {(status === 'BORRADOR' || status === 'APROBADA') && (
                  <Popconfirm title="¿Cancelar orden?" onConfirm={() => handleChangeStatus('CANCELADA')} okText="Sí" cancelText="No">
                    <Button icon={<CloseCircleOutlined />} danger type="default">Cancelar</Button>
                  </Popconfirm>
                )}
                {status === 'DESPACHADA' && (
                  <Button icon={<CloseCircleOutlined />} danger type="default" onClick={handleCancelDespachadaClick}>Cancelar</Button>
                )}
              </Space>
            )
          }
          style={{ marginBottom: 24, borderRadius: 8, overflow: 'hidden' }}
          styles={{ header: { backgroundColor: '#f5f5f5' } }}
        >
          <Form form={headerForm} layout="vertical" disabled={isReadOnly}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="client_id" label="Cliente" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Buscar cliente" onChange={handleClientChange} filterOption={(i, o) => o.children.toLowerCase().includes(i.toLowerCase())}>
                    {clients.map(c => <Option key={c.client_id} value={c.client_id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="client_address_id" label="Dirección de Entrega" rules={[{ required: true }]}>
                  <Select placeholder="Seleccionar Dirección">
                    {clientAddresses.map(a => <Option key={a.address_id} value={a.address_id}>{a.address_line} ({a.city})</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="delivery_date" label="Fecha de Entrega" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="transaction_category_id" label="Categoría (Opcional)">
                  <Select placeholder="Seleccionar" allowClear>
                    {categories.map(cat => <Option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>{cat.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="notes" label="Notas">
                  <TextArea rows={1} placeholder="Opcional..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>


        {orderId && isDraft && (
          <AddProductsCard
            orderId={orderId}
            allLots={allLots}
            allProducts={allProducts}
            clientCurrency={clientCurrency}
            onLineAdded={handleLineAdded}
          />
        )}

        {orderId && (
          <OrderLinesCard
            orderLines={orderLines}
            isReadOnly={isReadOnly}
            isDraft={isDraft}
            isApproved={isApproved}
            clientCurrency={clientCurrency}
            onEdit={openEditLineModal}
            onAssign={openAssignModal}
            onDelete={handleDeleteLine}
            onViewReservation={openReservationModal}
          />
        )}

      </div>

      <AssignInventoryModal
        open={assignModalOpen}
        detail={assigningDetail}
        allLots={allLots}
        onClose={closeAssignModal}
        onSubmit={handleAssignSubmit}
        onRelease={handleReleaseAssignment}
      />

      <EditLineModal
        open={editModalOpen}
        detail={editingDetail}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditLineSubmit}
        clientCurrency={clientCurrency}
      />

      <ReservationModal
        detail={reservationDetail}
        onClose={closeReservationModal}
        isDraft={isDraft}
        onRelease={handleReleaseAssignment}
      />

    </Spin>
  );
};

export default SalesOrderFormPage;
