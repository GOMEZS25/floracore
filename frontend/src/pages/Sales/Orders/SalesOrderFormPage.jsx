import React, { useState, useEffect, useRef } from 'react';
import {
  Form, Select, DatePicker, Input, InputNumber, Button,
  Table, Typography, Row, Col, Card, Spin, notification, Popconfirm, Space, Tag, Modal
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, CarOutlined, CloseCircleOutlined, EyeOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import salesService from '../../../services/salesService';
import clientService from '../../../services/clientService';
import lotService from '../../../services/lotService';

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_TAG = {
  BORRADOR: { color: 'warning', text: 'BORRADOR' },
  APROBADA: { color: 'processing', text: 'APROBADA' },
  DESPACHADA: { color: 'success', text: 'DESPACHADA' },
  CANCELADA: { color: 'error', text: 'CANCELADA' }
};

const buildLotLabel = (lote) => {
  const productName = lote.product?.name || '';
  const attrStr = lote.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
  const fullName = `${productName} ${attrStr}`.trim();
  const disp = lote.cantidad_disponible;
  const unidad = lote.unidad_medida?.toLowerCase() || 'tallos';
  return { fullName, disp, unidad, label: `${fullName} - ${lote.numero_lote}` };
};

const getCurrencySymbol = (currency) => {
  if (currency === 'USD') return 'USD';
  if (currency === 'EUR') return '€';
  return '$';
};

const SalesOrderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [headerForm] = Form.useForm();
  const [lineForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(id || null);
  const [orderData, setOrderData] = useState(null);
  const [clientCurrency, setClientCurrency] = useState('COP');
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);

  const [clients, setClients] = useState([]);
  const [clientAddresses, setClientAddresses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [allLots, setAllLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);

  const isViewMode = !!id;
  const autoSaved = useRef(!!id);
  const headerUpdateTimer = useRef(null);

  useEffect(() => {
    fetchInitialData();
    if (id) fetchOrder(id);
    else lineForm.setFieldsValue({ packaging_type: 'TALLO', billing_unit: 'TALLO', quantity: 1, unit_price: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [clientsRes, lotsRes, catRes] = await Promise.all([
        clientService.getClients({ is_active: 'true' }),
        lotService.getLots({ estado: 'DISPONIBLE' }),
        salesService.getTransactionCategories().catch(() => ({ data: [] }))
      ]);

      setClients(clientsRes?.data?.data || clientsRes?.data || []);
      const lts = lotsRes?.data?.data || lotsRes?.data || lotsRes || [];
      setAllLots(lts);
      setCategories(catRes?.data?.data || catRes?.data || catRes || []);
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

  const isReadOnly = orderData?.status === 'DESPACHADA' || orderData?.status === 'CANCELADA';

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
          .catch(err => {
            autoSaved.current = false;
          });
      }
    }
  }, [headerVals.client_id, headerVals.client_address_id, headerVals.delivery_date, headerVals.transaction_category_id, headerVals.notes, orderId, isReadOnly, orderData, navigate]);

  const handleLotSearch = (val) => {
    if (!val || val.length < 2) {
      setFilteredLots([]);
      return;
    }
    const txt = val.toLowerCase();
    const res = allLots.filter(l => {
      const lbl = buildLotLabel(l).label.toLowerCase();
      return lbl.includes(txt);
    });
    setFilteredLots(res);
  };

  const lineVals = Form.useWatch([], lineForm) || {};

  const getSelectedLot = () => {
    if (!lineVals.lote_id) return null;
    return allLots.find(l => String(l.lote_id) === String(lineVals.lote_id) || String(l.id) === String(lineVals.lote_id));
  };
  const selectedLot = getSelectedLot();

  const handleLotChange = (val) => {
    const lot = allLots.find(l => String(l.lote_id) === String(val) || String(l.id) === String(val));
    if (lot) {
      const pn = buildLotLabel(lot).fullName;
      lineForm.setFieldsValue({ producto: pn });
    } else {
      lineForm.setFieldsValue({ producto: '' });
    }
  };

  const handlePackagingChange = (val) => {
    lineForm.setFieldsValue({ quantity: 1, cantidad_ramos: 1, cantidad_cajas: 1, tallos_por_ramo: 25, ramos_por_caja: 10, billing_unit: val === 'CAJA' ? 'CAJA' : val === 'RAMO' ? 'RAMO' : 'TALLO' });
  };

  const calcStems = () => {
    const pt = lineVals.packaging_type;
    if (pt === 'TALLO') return lineVals.quantity || 0;
    if (pt === 'RAMO') return (lineVals.cantidad_ramos || 0) * (lineVals.tallos_por_ramo || 0);
    if (pt === 'CAJA') return (lineVals.cantidad_cajas || 0) * (lineVals.ramos_por_caja || 0) * (lineVals.tallos_por_ramo || 0);
    return 0;
  };
  const totalStemsCalc = calcStems();

  const calcSubtotal = () => {
    const price = lineVals.unit_price || 0;
    const bu = lineVals.billing_unit;
    const pt = lineVals.packaging_type;

    if (bu === 'TALLO') return totalStemsCalc * price;
    if (bu === 'RAMO') {
      const tBunches = pt === 'RAMO' ? lineVals.cantidad_ramos : pt === 'CAJA' ? ((lineVals.cantidad_cajas || 0) * (lineVals.ramos_por_caja || 0)) : 0;
      return tBunches * price;
    }
    if (bu === 'CAJA') {
      const tBoxes = pt === 'CAJA' ? lineVals.cantidad_cajas : 0;
      return tBoxes * price;
    }
    return 0;
  };
  const subtotalCalc = calcSubtotal();

  const billingOptions = () => {
    const pt = lineVals.packaging_type;
    if (pt === 'TALLO') return [{ label: 'TALLO', value: 'TALLO' }];
    if (pt === 'RAMO') return [{ label: 'TALLO', value: 'TALLO' }, { label: 'RAMO', value: 'RAMO' }];
    if (pt === 'CAJA') return [{ label: 'TALLO', value: 'TALLO' }, { label: 'RAMO', value: 'RAMO' }, { label: 'CAJA', value: 'CAJA' }];
    return [];
  };

  const priceLabel = () => {
    const bu = lineVals.billing_unit;
    if (bu === 'RAMO') return 'Precio por ramo';
    if (bu === 'CAJA') return 'Precio por caja';
    return 'Precio por tallo';
  };

  const handleAddLineSubmit = async (values) => {
    if (!selectedLot) return;
    if (totalStemsCalc > Number(selectedLot.cantidad_disponible)) {
      notification.error({
        message: 'Inventario insuficiente',
        description: `Necesitas ${totalStemsCalc} tallos, disponibles ${selectedLot.cantidad_disponible} tallos.`
      });
      return;
    }

    const payload = {
      lote_id: selectedLot.lote_id || selectedLot.id,
      product_id: selectedLot.product_id,
      packaging_type: values.packaging_type,
      quantity: values.packaging_type === 'TALLO' ? values.quantity : values.packaging_type === 'RAMO' ? values.cantidad_ramos : values.cantidad_cajas,
      tallos_por_ramo: values.packaging_type !== 'TALLO' ? values.tallos_por_ramo : undefined,
      ramos_por_caja: values.packaging_type === 'CAJA' ? values.ramos_por_caja : undefined,
      unit_price: values.unit_price,
      billing_unit: values.billing_unit,
      notes: values.notes
    };

    setLoading(true);
    try {
      await salesService.agregarLinea(orderId, payload);
      notification.success({ message: 'Línea agregada.' });
      lineForm.resetFields();
      lineForm.setFieldsValue({ packaging_type: 'TALLO', billing_unit: 'TALLO', quantity: 1, unit_price: 0 });
      setFilteredLots([]);
      fetchOrder(orderId);
      const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.mensaje || 'Error al agregar línea.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (detailId) => {
    setLoading(true);
    try {
      await salesService.eliminarLinea(detailId);
      notification.success({ message: 'Línea eliminada.' });
      fetchOrder(orderId);
      const lotsRes = await lotService.getLots({ estado: 'DISPONIBLE' });
      setAllLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
    } catch (error) {
      notification.error({
        message: 'Error al eliminar',
        description: error.response?.data?.mensaje || 'No se pudo eliminar la línea.'
      });
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await salesService.aprobarOrden(orderId);
      notification.success({ message: 'Orden aprobada con éxito' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({
        message: 'Error al aprobar',
        description: error.response?.data?.mensaje || 'No se pudo aprobar la orden.'
      });
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    try {
      setLoading(true);
      await salesService.despacharOrden(orderId);
      notification.success({ message: 'Orden despachada con éxito' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({
        message: 'Error al despachar',
        description: error.response?.data?.mensaje || 'No se pudo despachar la orden.'
      });
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      await salesService.cancelarOrden(orderId);
      notification.success({ message: 'Orden cancelada' });
      fetchOrder(orderId);
    } catch (error) {
      notification.error({
        message: 'Error al cancelar',
        description: error.response?.data?.mensaje || 'No se pudo cancelar la orden.'
      });
      setLoading(false);
    }
  };

  const orderLines = orderData?.details || [];
  const status = orderData?.status;
  const isDraft = status === 'BORRADOR';

  const lotColumns = [
    { title: 'Lote', dataIndex: 'numero_lote' },
    { title: 'Producto', key: 'prod', render: (_, l) => buildLotLabel(l).fullName },
    { title: 'Disponibilidad', dataIndex: 'cantidad_disponible' },
    {
      title: 'Seleccionar', key: 'sel', render: (_, lote) => (
        <Button size="small" type="primary" style={{ backgroundColor: '#1a3c2e' }}
          onClick={() => {
            lineForm.setFieldsValue({ lote_id: lote.lote_id || lote.id });
            handleLotChange(lote.lote_id || lote.id);
            setInventoryModalOpen(false);
          }}>Seleccionar</Button>
      )
    }
  ];

  const detailColumns = [
    {
      title: '#',
      dataIndex: 'line_number',
      width: 50,
      render: (val, _, idx) => val || idx + 1
    },
    {
      title: 'Lote',
      key: 'lote',
      width: 120,
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.lote?.numero_lote || r.lote_id}</Text>
    },
    {
      title: 'Producto',
      key: 'producto',
      width: 250,
      render: (_, r) => {
        const n = r.product?.name || '';
        const a = r.lote?.variant?.attributes?.map(x => x.value?.value).join(' ') || '';
        return <Text strong>{`${n} ${a}`.trim()}</Text>;
      }
    },
    {
      title: 'Unidad',
      dataIndex: 'packaging_type',
      width: 100,
      render: (val) => <Tag>{val}</Tag>
    },
    {
      title: 'Empaque',
      key: 'detalle',
      width: 250,
      render: (_, r) => {
        const pt = r.packaging_type;
        if (pt === 'TALLO') return `${r.quantity} tallos`;
        if (pt === 'RAMO') return `${r.quantity} ramos × ${r.stems_per_bunch} tpr = ${Number(r.quantity) * Number(r.stems_per_bunch)} tallos`;
        if (pt === 'CAJA') return `${r.quantity} cajas × ${r.bunches_per_box} rpc × ${r.stems_per_bunch} tpr = ${r.total_stems || (Number(r.quantity) * Number(r.bunches_per_box) * Number(r.stems_per_bunch))} tallos`;
        return '';
      }
    },
    {
      title: 'Und. Facturación',
      key: 'billing_unit',
      width: 120,
      render: (_, r) => r.billing_unit || r.packaging_type || 'TALLO'
    },
    {
      title: 'Precio unit.',
      key: 'up',
      width: 150,
      render: (_, r) => `${getCurrencySymbol(clientCurrency)} ${new Intl.NumberFormat('es-CO').format(Number(r.unit_price) || 0)} / ${(r.billing_unit || r.packaging_type || 'TALLO').toLowerCase()}`
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      width: 150,
      render: (v) => <Text strong>{getCurrencySymbol(clientCurrency)} {new Intl.NumberFormat('es-CO').format(Number(v) || 0)}</Text>
    },
    {
      title: 'Acciones',
      width: 80,
      render: (_, r) => {
        if (!isDraft) return null;
        return (
          <Popconfirm title="Eliminar línea?" onConfirm={() => handleDeleteLine(r.detail_id || r.id)}>
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        );
      }
    }
  ];

  const totalAmount = orderLines.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
  const totalTallos = orderLines.reduce((acc, l) => acc + (Number(l.total_stems) || 0), 0);

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px' }}>

        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space size="middle">
              <Button type="default" icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/orders')}>Volver</Button>
              <Button type="primary" style={{ backgroundColor: '#1a3c2e' }} icon={<PlusOutlined />} onClick={() => navigate('/sales/orders/new')}>Nueva Orden</Button>
              <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
                {orderData ? `Orden #${orderData.order_number}` : 'Nueva Orden'}
              </Title>
              {status && STATUS_TAG[status] && (
                <Tag color={STATUS_TAG[status].color} style={{ fontSize: 14, padding: '4px 8px' }}>
                  {STATUS_TAG[status].text}
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            {orderId && (
              <Space>
                {status === 'BORRADOR' && orderLines.length > 0 && (
                  <Button icon={<CheckCircleOutlined />} type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={handleApprove}>Aprobar</Button>
                )}
                {status === 'APROBADA' && (
                  <Button icon={<CarOutlined />} type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={handleDispatch}>Despachar</Button>
                )}
                {(status === 'BORRADOR' || status === 'APROBADA') && (
                  <Popconfirm title="¿Cancelar orden?" onConfirm={handleCancel} okText="Sí" cancelText="No">
                    <Button icon={<CloseCircleOutlined />} danger type="default">Cancelar</Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </Col>
        </Row>

        <Card title="Datos Generales" style={{ marginBottom: 24, borderRadius: 8, overflow: 'hidden' }} headStyle={{ backgroundColor: '#f5f5f5' }}>
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
          <Card
            title="Agregar Línea"
            style={{ marginBottom: 24, borderRadius: 8, borderColor: '#d9d9d9' }}
            headStyle={{ backgroundColor: '#f0f5f3', color: '#1a3c2e' }}
            extra={<Button icon={<EyeOutlined />} onClick={() => setInventoryModalOpen(true)}>Ver Inventario</Button>}
          >
            <Form form={lineForm} layout="vertical" onFinish={handleAddLineSubmit}>
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item name="lote_id" label="Lote" rules={[{ required: true, message: 'Requerido' }]}>
                    <Select
                      showSearch
                      placeholder="Escriba 2 o más letras para buscar"
                      onSearch={handleLotSearch}
                      onChange={handleLotChange}
                      filterOption={false}
                      notFoundContent={null}
                    >
                      {filteredLots.map(l => {
                        const lbl = buildLotLabel(l);
                        return (
                          <Option key={l.lote_id || l.id} value={l.lote_id || l.id}>
                            <div style={{ lineHeight: '1.2' }}>
                              <span>{lbl.label}</span>
                              <br />
                              <Text type="secondary" style={{ fontSize: 11 }}>{`${lbl.disp} ${lbl.unidad} disponibles`}</Text>
                            </div>
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="producto" label="Producto">
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={4}>
                  <Form.Item name="quantity" label="Cantidad" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item name="packaging_type" label="Empaque" rules={[{ required: true }]}>
                    <Select onChange={handlePackagingChange}>
                      <Option value="TALLO">TALLO</Option>
                      <Option value="RAMO">RAMO</Option>
                      <Option value="CAJA">CAJA</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="unit_price" label={priceLabel()} rules={[{ required: true }]}>
                    <InputNumber addonBefore={getCurrencySymbol(clientCurrency)} min={0} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="billing_unit" label="Facturar por" rules={[{ required: true }]}>
                    <Select options={billingOptions()} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item name="notes" label="Notas">
                    <Input placeholder="Opcional..." />
                  </Form.Item>
                </Col>
              </Row>

              {(lineVals.packaging_type === 'RAMO' || lineVals.packaging_type === 'CAJA') && (
                <Row gutter={16}>
                  {lineVals.packaging_type === 'RAMO' && (
                    <>
                      <Col xs={24} md={6}>
                        <Form.Item name="cantidad_ramos" label="Cantidad de ramos" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {lineVals.packaging_type === 'CAJA' && (
                    <>
                      <Col xs={24} md={6}>
                        <Form.Item name="cantidad_cajas" label="Cantidad de cajas" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item name="ramos_por_caja" label="Ramos por caja" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              )}

              <Row justify="end" align="middle" gutter={16} style={{ marginTop: 8 }}>
                <Col>
                  <Text type="secondary" style={{ fontSize: 13 }}>Total tallos a reservar: {totalStemsCalc} tallos</Text>
                </Col>
                <Col>
                  <Text strong>Subtotal: </Text>
                  <Text>{getCurrencySymbol(clientCurrency)} {new Intl.NumberFormat('es-CO').format(subtotalCalc)}</Text>
                </Col>
                <Col>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />} style={{ backgroundColor: '#1a3c2e' }}>
                    Agregar línea
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        )}

        {/* TABLA DE LINEAS */}
        {orderId && (
          <Card title="Líneas de la Orden" style={{ borderRadius: 8, overflow: 'hidden' }}>
            <Table
              columns={detailColumns}
              dataSource={orderLines}
              rowKey={(r) => r.detail_id || r.id}
              pagination={false}
              scroll={{ x: 800 }}
              locale={{ emptyText: 'No hay líneas.' }}
            />
            <Row justify="space-between" align="middle" style={{ marginTop: 16 }}>
              <Col>
                <Text type="secondary">
                  Total tallos reservados: <Text strong>{totalTallos} tallos</Text>
                </Text>
              </Col>
              <Col>
                <Text strong style={{ fontSize: 18 }}>
                  Total: {getCurrencySymbol(clientCurrency)} {new Intl.NumberFormat('es-CO').format(totalAmount)}
                </Text>
              </Col>
            </Row>
          </Card>
        )}

      </div>

      <Modal title="Inventario Disponible" width={1100} open={inventoryModalOpen} onCancel={() => setInventoryModalOpen(false)} footer={null}>
        <Table dataSource={allLots} columns={lotColumns} rowKey={r => r.lote_id || r.id} />
      </Modal>
    </Spin>
  );
};

export default SalesOrderFormPage;
