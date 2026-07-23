import React, { useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Button, Row, Col, Space, Typography } from 'antd';
import { getCurrencySymbol } from './orderFormHelpers';

const { Option } = Select;
const { Text } = Typography;

const EditLineModal = ({ open, detail, onClose, onSubmit, clientCurrency }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && detail) {
      form.setFieldsValue({
        packaging_type: detail.packaging_type,
        billing_unit: detail.billing_unit || detail.packaging_type,
        unit_price: Number(detail.unit_price),
        quantity: detail.quantity,
        tallos_por_ramo: detail.stems_per_bunch,
        ramos_por_caja: detail.bunches_per_box,
        cantidad_ramos: detail.packaging_type === 'RAMO' ? detail.quantity : undefined,
        cantidad_cajas: detail.packaging_type === 'CAJA' ? detail.quantity : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail]);

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <span>Editar Línea</span>
          {detail && (
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Línea #{detail.line_number} | {detail.product?.name}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="submit" type="primary" style={{ backgroundColor: '#1a3c2e' }} onClick={() => form.submit()}>
          Guardar cambios
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="packaging_type" label="Empaque" rules={[{ required: true }]}>
              <Select onChange={(val) => {
                form.setFieldsValue({ billing_unit: val, quantity: 0, cantidad_ramos: 0, cantidad_cajas: 0, tallos_por_ramo: 0, ramos_por_caja: 0 });
              }}>
                <Option value="TALLO">TALLO</Option>
                <Option value="RAMO">RAMO</Option>
                <Option value="CAJA">CAJA</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="billing_unit" label="Facturar por" rules={[{ required: true }]}>
              <Select>
                <Option value="TALLO">TALLO</Option>
                <Option value="RAMO">RAMO</Option>
                <Option value="CAJA">CAJA</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="unit_price" label="Precio unit." rules={[{ required: true }]}>
              <InputNumber addonBefore={getCurrencySymbol(clientCurrency)} min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item noStyle shouldUpdate>
          {() => {
            const pt = form.getFieldValue('packaging_type');
            return (
              <Row gutter={16}>
                {pt === 'TALLO' && (
                  <Col xs={24} md={8}>
                    <Form.Item name="quantity" label="Cantidad (tallos)" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                )}
                {pt === 'RAMO' && (
                  <>
                    <Col xs={24} md={8}>
                      <Form.Item name="cantidad_ramos" label="Cantidad ramos" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </>
                )}
                {pt === 'CAJA' && (
                  <>
                    <Col xs={24} md={8}>
                      <Form.Item name="cantidad_cajas" label="Cantidad cajas" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="ramos_por_caja" label="Ramos por caja" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="tallos_por_ramo" label="Tallos por ramo" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditLineModal;
