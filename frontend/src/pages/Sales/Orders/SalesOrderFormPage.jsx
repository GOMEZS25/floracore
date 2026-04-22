import React, { useState, useEffect } from 'react';
import {
  Form, Select, DatePicker, Input, InputNumber, Button,
  Table, Typography, Row, Col, Card, Spin, notification, Popconfirm, Space, Tag
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, CheckCircleOutlined, CarOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import salesService from '../../../services/salesService';
import clientService from '../../../services/clientService';
import lotService from '../../../services/lotService';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

const STATUS_TAG_COLOR = {
  BORRADOR: 'default',
  APROBADA: 'processing',
  DESPACHADA: 'success',
  CANCELADA: 'error',
};

const buildLotLabel = (lote) => {
  const productName = lote.product?.name || '';
  const attrStr = lote.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
  const fullName = `${productName} ${attrStr}`.trim();
  const disp = lote.cantidad_disponible;
  const unidad = lote.unidad_medida?.toLowerCase() || 'tallos';
  return { fullName, disp, unidad, label: `${fullName} - ${lote.numero_lote}` };
};

const SalesOrderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isViewMode = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orderData, setOrderData] = useState(null);
  const [nextOrderNumber, setNextOrderNumber] = useState(null);

  // Data for Selects
  const [clients, setClients] = useState([]);
  const [clientAddresses, setClientAddresses] = useState([]);
  const [lots, setLots] = useState([]);
  const [categories, setCategories] = useState([]);

  // Lines state for total calculation
  const [lines, setLines] = useState([]);

  useEffect(() => {
    fetchInitialData();
    if (isViewMode) {
      fetchOrder(id);
    }
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
      setLots(lotsRes?.data?.data || lotsRes?.data || lotsRes || []);
      setCategories(catRes?.data?.data || catRes?.data || catRes || []);

      if (!isViewMode) {
        try {
          const numRes = await salesService.getNextOrderNumber();
          if (numRes?.data?.order_number) {
            setNextOrderNumber(numRes.data.order_number);
          }
        } catch (e) {
          console.error("Error fetching order number", e);
        }
      }

    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los datos auxiliares.' });
    } finally {
      if (!isViewMode) setLoading(false);
    }
  };

  const fetchOrder = async (orderId) => {
    try {
      const res = await salesService.obtenerOrden(orderId);
      const data = res?.data?.data || res?.data || res;
      setOrderData(data);

      form.setFieldsValue({
        client_id: data.client_id,
        client_address_id: data.client_address_id,
        delivery_date: data.delivery_date ? dayjs(data.delivery_date) : null,
        transaction_category_id: data.transaction_category_id,
        notes: data.notes,
      });

      // Fetch client to populate addresses correctly
      const clientRes = await clientService.getClientById(data.client_id);
      const clientInfo = clientRes?.data?.data || clientRes?.data || clientRes;
      if (clientInfo && clientInfo.addresses) {
        setClientAddresses(clientInfo.addresses.filter(a => a.is_active !== false));
      }

      const orderLines = (data.details || []).map(d => ({
        ...d,
        productName: d.product?.name,
        attrStr: d.lote?.variant?.attributes?.map(a => a.value?.value).join(' ') || '',
        unidad_medida: d.lote?.unidad_medida
      }));

      setLines(orderLines);

    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudo cargar la orden.' });
      navigate('/sales/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId) => {
    form.setFieldsValue({ client_address_id: undefined });
    setClientAddresses([]);
    if (!clientId) return;

    try {
      const res = await clientService.getClientById(clientId);
      const clientInfo = res?.data?.data || res?.data || res;
      if (clientInfo && clientInfo.addresses) {
        setClientAddresses(clientInfo.addresses.filter(a => a.is_active !== false));
        if (clientInfo.addresses.length > 0) {
          form.setFieldsValue({ client_address_id: clientInfo.addresses[0].address_id });
        }
      }
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudieron cargar las direcciones del cliente.' });
    }
  };

  const handleAddLine = () => {
    setLines([...lines, {
      key: Date.now(),
      lote_id: undefined,
      product_id: undefined,
      packaging_type: 'CAJA',
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
      notes: ''
    }]);
  };

  const handleRemoveLine = (index) => {
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;

    if (field === 'lote_id') {
      const selectedLot = lots.find(l => (l.lote_id === value || l.id === value));
      if (selectedLot) {
        newLines[index].product_id = selectedLot.product_id;
        newLines[index].productName = selectedLot.product?.name;
        newLines[index].attrStr = selectedLot.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
        newLines[index].unidad_medida = selectedLot.unidad_medida;
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      newLines[index].subtotal = (newLines[index].quantity || 0) * (newLines[index].unit_price || 0);
    }

    setLines(newLines);
  };

  const getLotMaxQuantity = (loteId) => {
    if (!loteId) return 999999;
    const lot = lots.find(l => l.lote_id === loteId || l.id === loteId);
    return lot ? lot.cantidad_disponible : 999999;
  };

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);
      const validLines = lines.filter(l => l.lote_id);
      
      const payload = {
        ...values,
        delivery_date: values.delivery_date.format('YYYY-MM-DD'),
        total: validLines.reduce((sum, l) => sum + (l.subtotal || 0), 0),
        details: validLines.map(l => ({
          lote_id: l.lote_id,
          product_id: l.product_id,
          packaging_type: l.packaging_type,
          quantity: l.quantity,
          unit_price: l.unit_price,
          subtotal: l.subtotal,
          notes: l.notes
        }))
      };

      const res = await salesService.crearOrden(payload);
      notification.success({ message: 'Borrador guardado exitosamente' });
      const newId = res?.data?.data?.sales_order_id || res?.data?.sales_order_id || res?.data?.id || res?.id;
      if (newId) {
        navigate(`/sales/orders/${newId}`);
      } else {
        navigate('/sales/orders');
      }
    } catch (error) {
      if (error.errorFields) return;
      notification.error({
        message: 'Error al guardar',
        description: error.response?.data?.mensaje || 'No se pudo crear la orden.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await salesService.aprobarOrden(orderData.sales_order_id || orderData.id);
      notification.success({ message: 'Orden aprobada con éxito' });
      fetchOrder(id);
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
      await salesService.despacharOrden(orderData.sales_order_id || orderData.id);
      notification.success({ message: 'Orden despachada con éxito' });
      fetchOrder(id);
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
      await salesService.cancelarOrden(orderData.sales_order_id || orderData.id);
      notification.success({ message: 'Orden cancelada' });
      fetchOrder(id);
    } catch (error) {
      notification.error({
        message: 'Error al cancelar',
        description: error.response?.data?.mensaje || 'No se pudo cancelar la orden.'
      });
      setLoading(false);
    }
  };

  const totalOrder = lines.reduce((sum, l) => sum + (Number(l.subtotal) || 0), 0);
  const status = orderData?.status;

  const renderActionButtons = () => {
    if (!isViewMode) return null;

    return (
      <Space>
        {status === 'BORRADOR' && (
          <Popconfirm title="¿Aprobar confirmación de la orden?" onConfirm={handleApprove} okText="Sí" cancelText="No">
            <Button icon={<CheckCircleOutlined />} type="default" style={{ color: '#1890ff', borderColor: '#1890ff' }}>
              Aprobar
            </Button>
          </Popconfirm>
        )}
        {status === 'APROBADA' && (
          <Popconfirm title="¿Despachar esta orden? Se afectará el inventario." onConfirm={handleDispatch} okText="Sí" cancelText="No">
            <Button icon={<CarOutlined />} type="default" style={{ color: '#52c41a', borderColor: '#52c41a' }}>
              Despachar
            </Button>
          </Popconfirm>
        )}
        {(status === 'BORRADOR' || status === 'APROBADA') && (
          <Popconfirm title="¿Cancelar esta orden? Es una acción irreversible." onConfirm={handleCancel} okText="Sí" cancelText="No">
            <Button icon={<CloseCircleOutlined />} danger>
              Cancelar
            </Button>
          </Popconfirm>
        )}
      </Space>
    );
  };

  const detailColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1
    },
    {
      title: 'Lote',
      dataIndex: 'lote_id',
      key: 'lote_id',
      width: 300,
      render: (val, record, index) => {
        if (isViewMode) return <Text>{record.lot?.numero_lote || val}</Text>;
        return (
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Seleccionar Lote"
            value={val}
            onChange={(v) => handleLineChange(index, 'lote_id', v)}
            filterOption={(input, option) => option.props.label.toLowerCase().includes(input.toLowerCase())}
          >
            {lots.map(lote => (
              <Option key={lote.lote_id || lote.id} value={(lote.lote_id || lote.id)} label={buildLotLabel(lote).label}>
                <div>
                  <Text strong>{buildLotLabel(lote).fullName} — {lote.numero_lote}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {lote.cantidad_disponible} {lote.unidad_medida?.toLowerCase()} disponibles
                    </Text>
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        )
      }
    },
    {
      title: 'Producto',
      key: 'product',
      width: 200,
      render: (_, record) => {
        const productName = record.productName || '';
        const attrStr = record.attrStr || '';
        return (
          <div>
            <Text strong>{`${productName} ${attrStr}`.trim()}</Text>
          </div>
        );
      }
    },
    {
      title: 'Tipo',
      dataIndex: 'packaging_type',
      key: 'packaging_type',
      width: 150,
      render: (val, record, index) => {
        if (isViewMode) return <Text>{val}</Text>;
        return (
          <Select style={{ width: '100%' }} value={val} onChange={(v) => handleLineChange(index, 'packaging_type', v)}>
            <Option value="TALLO">TALLO</Option>
            <Option value="RAMO">RAMO</Option>
            <Option value="CAJA">CAJA</Option>
          </Select>
        );
      }
    },
    {
      title: 'Cant.',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (val, record, index) => {
        if (isViewMode) return <Text>{val}</Text>;
        return (
          <InputNumber
            min={1}
            max={getLotMaxQuantity(record.lote_id)}
            value={val}
            onChange={(v) => handleLineChange(index, 'quantity', v)}
            style={{ width: '100%' }}
          />
        );
      }
    },
    {
      title: 'Precio Und.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (val, record, index) => {
        if (isViewMode) return <Text>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val)}</Text>;
        return (
          <div>
            <InputNumber
              min={0}
              value={val}
              onChange={(v) => handleLineChange(index, 'unit_price', v)}
              style={{ width: '100%' }}
            />
            {record.unidad_medida && (
              <div>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  por {record.unidad_medida.toLowerCase()}
                </Text>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 150,
      render: (val) => <Text strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0)}</Text>
    },
    {
      title: 'Acc.',
      key: 'action',
      width: 60,
      render: (_, __, index) => {
        if (isViewMode) return null;
        return (
          <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveLine(index)} />
        );
      }
    }
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space size="large">
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sales/orders')}>Volver</Button>
              <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
                {isViewMode ? `Orden #${orderData?.order_number || ''}` : `Nueva Orden #${nextOrderNumber || '...'}`}
              </Title>
              {isViewMode && status && (
                <Tag color={STATUS_TAG_COLOR[status] || 'default'} style={{ fontSize: 14, padding: '4px 8px' }}>
                  {status}
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            {renderActionButtons()}
          </Col>
        </Row>

        <Card title="Datos Generales" style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical" disabled={isViewMode}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="client_id" label="Cliente" rules={[{ required: true, message: 'Requerido' }]}>
                  <Select
                    showSearch
                    placeholder="Seleccionar Cliente"
                    onChange={handleClientChange}
                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                  >
                    {clients.map(c => <Option key={c.client_id} value={c.client_id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="client_address_id" label="Dirección de Entrega" rules={[{ required: true, message: 'Requerido' }]}>
                  <Select placeholder="Seleccionar Dirección">
                    {clientAddresses.map(a => (
                      <Option key={a.address_id} value={a.address_id}>
                        {a.address_line} ({a.city}, {a.country})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="delivery_date" label="Fecha de Entrega" rules={[{ required: true, message: 'Requerido' }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="transaction_category_id" label="Categoría (Opcional)">
                  <Select placeholder="Seleccionar Categoría" allowClear>
                    {categories.map(cat => <Option key={cat.id || cat.category_id} value={cat.id || cat.category_id}>{cat.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="notes" label="Notas">
                  <TextArea rows={2} maxLength={500} placeholder="Observaciones de la orden..." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          title="Líneas de Detalle"
          extra={!isViewMode && (
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLine} style={{ borderColor: '#1a3c2e', color: '#1a3c2e' }}>
              Agregar línea
            </Button>
          )}
          style={{ marginBottom: 16 }}
        >
          <Table
            columns={detailColumns}
            dataSource={lines}
            rowKey="key"
            pagination={false}
            scroll={{ x: 800 }}
            locale={{ emptyText: 'No hay líneas. Agregue una para empezar.' }}
          />
        </Card>

        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0, color: '#1a3c2e' }}>
                Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalOrder)}
              </Title>
            </Col>
            <Col>
              {!isViewMode && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveDraft}
                  loading={saving}
                  style={{ backgroundColor: '#1a3c2e' }}
                >
                  Guardar borrador
                </Button>
              )}
            </Col>
          </Row>
        </Card>

      </div>
    </Spin>
  );
};

export default SalesOrderFormPage;
