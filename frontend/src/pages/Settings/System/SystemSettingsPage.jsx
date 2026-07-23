import React, { useState, useEffect } from 'react';
import { Form, Select, Checkbox, Button, Card, Typography, notification, Spin } from 'antd';
import lotService from '../../../services/lotService';

const { Title } = Typography;
const { Option } = Select;

const SystemSettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await lotService.getCompanySettings();
      const settings = response?.data || response || {};
      form.setFieldsValue({
        inventory_mode: settings.inventory_mode,
        show_stems_per_bunch: settings.show_stems_per_bunch,
        show_bunches_per_box: settings.show_bunches_per_box,
        show_box_type: settings.show_box_type,
      });
    } catch {
      notification.error({ message: 'Error', description: 'No se pudo cargar la configuración del sistema.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await lotService.updateCompanySettings(values);
      notification.success({ message: 'Configuración actualizada correctamente' });
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.response?.data?.mensaje || 'No se pudo guardar la configuración.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3} style={{ margin: 0, marginBottom: 16, color: '#595959', fontWeight: 600 }}>
        Configuración del Sistema
      </Title>

      <Card style={{ maxWidth: 520 }}>
        <Spin spinning={loading}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="inventory_mode"
              label="Modo de inventario por defecto"
              rules={[{ required: true, message: 'Campo requerido' }]}
            >
              <Select>
                <Option value="TALLOS">Tallos</Option>
                <Option value="RAMOS">Ramos</Option>
                <Option value="CAJAS">Cajas</Option>
              </Select>
            </Form.Item>

            <Form.Item name="show_stems_per_bunch" valuePropName="checked">
              <Checkbox>Mostrar campo "Tallos x Ramo" en lotes</Checkbox>
            </Form.Item>

            <Form.Item name="show_bunches_per_box" valuePropName="checked">
              <Checkbox>Mostrar campo "Ramos x Caja" en lotes</Checkbox>
            </Form.Item>

            <Form.Item name="show_box_type" valuePropName="checked">
              <Checkbox>Mostrar campo "Tipo de Caja" en lotes</Checkbox>
            </Form.Item>
          </Form>
        </Spin>

        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          style={{ backgroundColor: '#1a3c2e' }}
        >
          Guardar Cambios
        </Button>
      </Card>
    </div>
  );
};

export default SystemSettingsPage;
