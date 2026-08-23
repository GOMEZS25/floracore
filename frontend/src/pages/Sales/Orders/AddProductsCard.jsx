import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, InputNumber, Input, Button, Row, Col, Segmented,
  Alert, Typography, Space, Modal, Table, notification, Divider
} from 'antd';
import { PlusOutlined, EyeOutlined, InboxOutlined, AppstoreOutlined } from '@ant-design/icons';
import salesService from '../../../services/salesService';
import { buildLotLabel, getCurrencySymbol, formatMoney } from './orderFormHelpers';

const { Option } = Select;
const { Text } = Typography;

const DEFAULT_LINE_VALUES = { packaging_type: 'TALLO', billing_unit: 'TALLO', quantity: 0, unit_price: 0 };

const AddProductsCard = ({ orderId, allLots, allProducts, clientCurrency, onLineAdded }) => {
  const [form] = Form.useForm();
  const [addMode, setAddMode] = useState('LOTE');
  const [filteredLots, setFilteredLots] = useState([]);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(DEFAULT_LINE_VALUES);
    setFilteredLots([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMode, form]);

  const lineVals = Form.useWatch([], form) || {};

  const handleLotSearch = (val) => {
    if (!val || val.length < 2) { setFilteredLots([]); return; }
    const txt = val.toLowerCase();
    setFilteredLots(allLots.filter(l => buildLotLabel(l).label.toLowerCase().includes(txt)));
  };

  const getSelectedLot = () => {
    if (!lineVals.lote_id) return null;
    return allLots.find(l => String(l.lote_id) === String(lineVals.lote_id) || String(l.id) === String(lineVals.lote_id));
  };
  const selectedLot = getSelectedLot();

  const handleLotChange = (val) => {
    const lot = allLots.find(l => String(l.lote_id) === String(val) || String(l.id) === String(val));
    form.setFieldsValue({ producto: lot ? buildLotLabel(lot).fullName : '' });
  };

  const handlePackagingChange = (val) => {
    form.setFieldsValue({
      quantity: 0, cantidad_ramos: 0, cantidad_cajas: 0, tallos_por_ramo: 0, ramos_por_caja: 0,
      billing_unit: val === 'CAJA' ? 'CAJA' : val === 'RAMO' ? 'RAMO' : 'TALLO'
    });
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
    if (bu === 'CAJA') return (pt === 'CAJA' ? lineVals.cantidad_cajas : 0) * price;
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
    if (addMode === 'LOTE') {
      if (!selectedLot) { notification.error({ message: 'Selecciona un lote' }); return; }
      if (totalStemsCalc > Number(selectedLot.cantidad_disponible)) {
        notification.error({ message: 'Inventario insuficiente', description: `Necesitas ${totalStemsCalc} tallos, disponibles ${selectedLot.cantidad_disponible} tallos.` });
        return;
      }
    }
    if (!values.product_variant_key && addMode === 'PRODUCTO') { notification.error({ message: 'Selecciona un producto' }); return; }

    let product_id = null;
    let variant_id = null;
    if (addMode === 'LOTE') {
      product_id = selectedLot?.product_id;
    } else {
      const parts = String(values.product_variant_key).split('_');
      product_id = parts[0];
      if (parts[1] && parts[1] !== 'base') variant_id = parts[1];
    }

    const payload = {
      lote_id: addMode === 'LOTE' ? (selectedLot?.lote_id || selectedLot?.id) : null,
      product_id: product_id,
      variant_id: variant_id,
      packaging_type: values.packaging_type,
      quantity: values.packaging_type === 'TALLO' ? values.cantidad_tallos : values.packaging_type === 'RAMO' ? values.cantidad_ramos : values.cantidad_cajas,
      tallos_por_ramo: values.packaging_type !== 'TALLO' ? values.tallos_por_ramo : undefined,
      ramos_por_caja: values.packaging_type === 'CAJA' ? values.ramos_por_caja : undefined,
      unit_price: values.unit_price,
      billing_unit: values.billing_unit,
      notes: values.notes
    };

    setSubmitting(true);
    try {
      await salesService.agregarLinea(orderId, payload);
      notification.success({ message: 'Línea agregada.' });
      form.resetFields();
      form.setFieldsValue(DEFAULT_LINE_VALUES);
      setFilteredLots([]);
      onLineAdded();
    } catch (error) {
      notification.error({ message: 'Error', description: error.response?.data?.mensaje || 'Error al agregar línea.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnterToNext = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {

      if (document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')) return;

      e.preventDefault();
      const container = document.querySelector('.add-line-form');
      if (container) {
        // Find all focusable inputs/buttons in the form
        const focusable = Array.from(container.querySelectorAll('input:not([disabled]), textarea:not([disabled]), button:not([disabled])'));
        const index = focusable.indexOf(e.target);
        if (index > -1 && index < focusable.length - 1) {
          focusable[index + 1].focus();
        } else if (index === focusable.length - 1) {
          form.submit();
        }
      }
    }
  };

  const lotColumns = [
    { title: 'Lote', dataIndex: 'numero_lote' },
    { title: 'Producto', key: 'prod', render: (_, l) => buildLotLabel(l).fullName },
    { title: 'Disponibilidad', dataIndex: 'cantidad_disponible' },
    {
      title: 'Seleccionar', key: 'sel', render: (_, lote) => (
        <Button size="small" type="primary" style={{ backgroundColor: 'var(--fc-accent)' }}
          onClick={() => {
            setFilteredLots([lote]);  // ← primero actualizar las opciones
            setTimeout(() => {        // ← luego setear el valor
              form.setFieldsValue({ lote_id: lote.lote_id || lote.id });
              handleLotChange(lote.lote_id || lote.id);
            }, 0);
            setInventoryModalOpen(false);
          }}>Seleccionar</Button>
      )
    }
  ];

  return (
    <>
      <Card
        title="Agregar Productos"
        variant="borderless"
        style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        styles={{ header: { border: 'none' }, body: { paddingTop: 8 } }}
        extra={
          <Space size={16} align="center">
            <Segmented
              value={addMode}
              onChange={setAddMode}
              options={[
                { label: <Space size={4}><InboxOutlined /> Por Lote</Space>, value: 'LOTE' },
                { label: <Space size={4}><AppstoreOutlined /> Por Producto</Space>, value: 'PRODUCTO' },
              ]}
            />
            <Button type="text" icon={<EyeOutlined />} onClick={() => setInventoryModalOpen(true)} style={{ color: '#8c8c8c' }}>
              Ver Inventario
            </Button>
          </Space>
        }
      >
        {addMode === 'PRODUCTO' && (
          <Alert
            type="info"
            showIcon
            message="Modo Producto: El inventario no se afecta al agregar la línea. Usa el botón de asignación en la tabla para asignar lotes más tarde."
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleAddLineSubmit} className="add-line-form" onKeyDown={handleEnterToNext}>

          <Divider titlePlacement="left" plain styles={{ content: { margin: 0 } }} style={{ margin: '0 0 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8c8c8c' }}>
            Producto
          </Divider>
          <Row gutter={16}>
            {addMode === 'LOTE' ? (
              <Col xs={24} md={12}>
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
                            <span>{lbl.label}</span><br />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {`${lbl.disp} ${lbl.unidad} disponibles`}
                            </Text>
                          </div>
                        </Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </Col>
            ) : (
              <Col xs={24} md={12}>
                <Form.Item
                  name="product_variant_key"
                  label="Producto / Variante"
                  rules={[{ required: true, message: 'Requerido' }]}
                >
                  <Select
                    showSearch
                    placeholder="Buscar producto o variante..."
                    filterOption={(input, option) =>
                      option?.label?.toString().toLowerCase().includes(input.toLowerCase())
                    }
                    options={[
                      ...allProducts.flatMap(p => {
                        if (!p.variants || p.variants.length === 0) {
                          return [{ value: `${p.product_id}_base`, label: p.name }];
                        }
                        return p.variants.map(v => {
                          const attrStr = v.attributes?.map(a => a.value?.value).join(' ') || '';
                          return { value: `${p.product_id}_${v.variant_id}`, label: attrStr ? `${p.name} ${attrStr}` : p.name };
                        });
                      })
                    ]}
                  />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={6}>
              <Form.Item name="packaging_type" label="Empaque" rules={[{ required: true }]}>
                <Select onChange={handlePackagingChange}>
                  <Option value="TALLO">Tallo</Option>
                  <Option value="RAMO">Ramo</Option>
                  <Option value="CAJA">Caja</Option>
                </Select>
              </Form.Item>
            </Col>

            {lineVals.packaging_type && (
              <Col xs={24} md={6}>
                {lineVals.packaging_type === 'TALLO' && (
                  <Form.Item name="cantidad_tallos" label="Tallos" rules={[{ required: true, message: 'Ingresa la cantidad de tallos' }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                )}
                {lineVals.packaging_type === 'RAMO' && (
                  <Form.Item name="cantidad_ramos" label="Cantidad de ramos" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                )}
                {lineVals.packaging_type === 'CAJA' && (
                  <Form.Item name="cantidad_cajas" label="Cantidad de cajas" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                )}
              </Col>
            )}
          </Row>

          {/* Composición del empaque */}
          {(lineVals.packaging_type === 'RAMO' || lineVals.packaging_type === 'CAJA') && (
            <>
              <Divider titlePlacement="left" plain styles={{ content: { margin: 0 } }} style={{ margin: '0 0 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8c8c8c' }}>
                Composición del empaque
              </Divider>
              <Row gutter={16}>
                {lineVals.packaging_type === 'CAJA' && (
                  <Col xs={24} md={6}>
                    <Form.Item name="ramos_por_caja" label="Ramos por caja" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                )}
                <Col xs={24} md={6}>
                  <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Precio */}
          {lineVals.packaging_type && (
            <>
              <Divider titlePlacement="left" plain styles={{ content: { margin: 0 } }} style={{ margin: '0 0 16px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8c8c8c' }}>
                Precio
              </Divider>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="unit_price" label={priceLabel()} rules={[{ required: true }]}>
                    <InputNumber
                      prefix={getCurrencySymbol(clientCurrency)}
                      min={0}
                      step={0.01}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="billing_unit" label="Se cobra por" rules={[{ required: true }]}>
                    <Select options={billingOptions()} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="notes" label="Notas">
                    <Input placeholder="Opcional..." />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Franja de resultado */}
          {Number(totalStemsCalc) > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#E1F5EE',
              border: '0.5px solid #5DCAA5',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 18, color: '#0F6E56' }}>→</span>
              <span>
                {addMode === 'LOTE' && (
                  <Text strong style={{ color: '#04342C' }}>
                    {totalStemsCalc} tallos a reservar&nbsp;&nbsp;·&nbsp;&nbsp;
                  </Text>
                )}
                <Text style={{ color: '#04342C' }}>
                  Subtotal:{' '}
                  <Text strong style={{ color: '#04342C' }}>
                    {getCurrencySymbol(clientCurrency)} {formatMoney(subtotalCalc)}
                  </Text>
                </Text>
              </span>
            </div>
          )}

          <Row justify="end">
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={submitting}
                style={{ backgroundColor: 'var(--fc-accent)' }}
              >
                Agregar línea
              </Button>
            </Col>
          </Row>

        </Form>
      </Card>

      <Modal title="Inventario Disponible" width={1100} open={inventoryModalOpen} onCancel={() => setInventoryModalOpen(false)} footer={null}>
        <Table dataSource={allLots} columns={lotColumns} rowKey={r => r.lote_id || r.id} />
      </Modal>
    </>
  );
};

export default AddProductsCard;
