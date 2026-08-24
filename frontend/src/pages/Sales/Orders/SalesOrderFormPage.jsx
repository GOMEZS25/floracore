import React, { useState, useEffect, useRef } from 'react';
import {
  Form, Select, DatePicker, Input, Button,
  Typography, Row, Col, Card, Spin, notification, Popconfirm, Modal,
  Space, Tag, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined,
  CheckCircleOutlined, CarOutlined, CloseCircleOutlined, RollbackOutlined,
  ExclamationCircleOutlined, SaveOutlined, PrinterOutlined
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
import InlineLinesTable from './InlineLinesTable';
import { formatOrderNumber } from '../../../utils/orderNumber';
import './SalesOrderForm.css';

const { Option } = Select;
const { Title } = Typography;
const { TextArea } = Input;

const STATUS_BADGE = {
  BORRADOR: { bg: 'var(--fc-badge-draft-bg)', text: 'var(--fc-badge-draft-text)', label: 'BORRADOR' },
  APROBADA: { bg: 'var(--fc-badge-approved-bg)', text: 'var(--fc-badge-approved-text)', label: 'APROBADA' },
  DESPACHADA: { bg: 'var(--fc-badge-dispatched-bg)', text: 'var(--fc-badge-dispatched-text)', label: 'DESPACHADA' },
  CANCELADA: { bg: 'var(--fc-badge-canceled-bg)', text: 'var(--fc-badge-canceled-text)', label: 'CANCELADA' },
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
        delivery_date: data.delivery_date ? dayjs(data.delivery_date.slice(0, 10)) : null,
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

  const handleGuardar = () => {
    if (!orderId) {
      notification.info({ message: 'Completa los datos generales para guardar el borrador' });
      return;
    }
    notification.success({ message: 'Orden guardada' });
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
  const totalAmount = orderLines.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
  const totalTallos = orderLines.reduce((acc, l) => acc + (Number(l.total_stems) || 0), 0);
  const totalLineas = orderLines.length;
  const formatCurrency = (n) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: clientCurrency || 'COP', maximumFractionDigits: 0,
  }).format(Number(n) || 0);
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

        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            color: 'var(--fc-text-muted)',
            marginBottom: 8,
          }}>
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/sales/orders')}
            >ÓRDENES DE VENTA</span>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>{orderData ? 'EDITAR' : 'NUEVA'}</span>
          </div>

          <Row justify="space-between" align="middle" wrap style={{ rowGap: 12 }}>
            <Col>
              <Title level={2} style={{
                margin: 0,
                fontWeight: 600,
                color: 'var(--fc-text-primary)',
                fontSize: 28,
                display: 'inline-block',
                marginRight: 12,
              }}>
                {orderData ? `Orden ${formatOrderNumber(orderData.order_number)}` : 'Nueva Orden'}
              </Title>
              {status && STATUS_BADGE[status] && (
                <span style={{
                  backgroundColor: STATUS_BADGE[status].bg,
                  color: STATUS_BADGE[status].text,
                  padding: '4px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  verticalAlign: 'middle',
                }}>
                  {STATUS_BADGE[status].label}
                </span>
              )}
            </Col>
            <Col>
              <Space size={12} align="center">
                <Button icon={<SaveOutlined />} onClick={handleGuardar}>Guardar</Button>
                <Tooltip title="Próximamente">
                  <Button icon={<PrinterOutlined />} disabled>Imprimir</Button>
                </Tooltip>
                {status === 'BORRADOR' && orderLines.length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleChangeStatus('APROBADA')}
                  >Confirmar orden</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={24}>
        <Col xs={24} md={16}>

        <Card
          title={
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--fc-text-primary)',
            }}>
              Detalles de la orden
            </span>
          }
          variant="borderless"
          style={{
            marginBottom: 24,
            borderRadius: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid var(--fc-border)',
            backgroundColor: 'var(--fc-surface)',
          }}
          styles={{
            header: {
              border: 'none',
              paddingTop: 20,
              paddingBottom: 4,
            },
            body: {
              paddingTop: 12,
            },
          }}
        >
          <Form form={headerForm} layout="vertical" disabled={isReadOnly}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="client_id" label={<span style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'var(--fc-text-secondary)',
                  fontWeight: 500,
                }}>Cliente</span>} rules={[{ required: true }]}>
                  <Select showSearch placeholder="Buscar cliente" onChange={handleClientChange} filterOption={(i, o) => o.children.toLowerCase().includes(i.toLowerCase())}>
                    {clients.map(c => <Option key={c.client_id} value={c.client_id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="client_address_id" label={<span style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'var(--fc-text-secondary)',
                  fontWeight: 500,
                }}>Dirección de Entrega</span>} rules={[{ required: true }]}>
                  <Select placeholder="Seleccionar Dirección">
                    {clientAddresses.map(a => <Option key={a.address_id} value={a.address_id}>{a.address_line} ({a.city})</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="delivery_date" label={<span style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'var(--fc-text-secondary)',
                  fontWeight: 500,
                }}>Fecha de Entrega</span>} rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="transaction_category_id" label={<span style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'var(--fc-text-secondary)',
                  fontWeight: 500,
                }}>Categoría (Opcional)</span>}>
                  <Select placeholder="Seleccionar" allowClear>
                    {categories.map(cat => <Option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>{cat.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="notes" label={<span style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: 'var(--fc-text-secondary)',
                  fontWeight: 500,
                }}>Notas</span>}>
                  <TextArea rows={1} placeholder="Opcional..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>


        {/* Reemplazado en C4a — se dejan comentados por rollback */}
        {/*
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
        */}

        <InlineLinesTable
          orderId={orderId}
          orderLines={orderLines}
          allProducts={allProducts}
          clientCurrency={clientCurrency}
          isReadOnly={isReadOnly}
          onLinesChanged={handleLineAdded}
        />

        </Col>

        <Col xs={0} md={8}>
          <div style={{
            position: 'sticky',
            top: 24,
          }}>
            <div style={{
              backgroundColor: 'var(--fc-surface-dark)',
              color: 'var(--fc-text-on-dark)',
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: 'var(--fc-text-muted)',
                marginBottom: 16,
              }}>Resumen</div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                fontSize: 14,
              }}>
                <span>Subtotal</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>

              <div style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
                margin: '16px 0',
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div style={{
                fontSize: 12,
                color: 'var(--fc-text-muted)',
                marginTop: 4,
              }}>
                {totalTallos.toLocaleString('es-CO')} tallos · {totalLineas} {totalLineas === 1 ? 'línea' : 'líneas'}
              </div>
            </div>
          </div>
        </Col>
        </Row>

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
