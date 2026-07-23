import React, { useEffect } from 'react';
import { Modal, Form, Button, InputNumber, Typography, notification } from 'antd';
import lotService from '../../../services/lotService';

const { Text } = Typography;

const buildVariantName = (v, pName) => {
  const attrStr = v.attributes?.map(a => a.value?.value).join(' ') || '';
  return `${pName} ${attrStr}`.trim();
};

const AddQuantityModal = ({ open, lot, onClose, onSuccess }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await lotService.addQuantity(lot.lote_id, values.cantidad_add);
      notification.success({ message: 'Cantidad adicionada exitosamente' });
      onSuccess();
      onClose();
    } catch (error) {
      if (error.response) {
        notification.error({
          message: 'Error al adicionar',
          description: error.response.data?.mensaje || 'No se pudo adicionar cantidad'
        });
      }
    }
  };

  return (
    <Modal
      title={`Adicionar cantidad — ${lot?.numero_lote}`}
      open={open}
      onCancel={onClose}
      width={380}
      destroyOnClose
      footer={[
        <Button key="cancelAdd" onClick={onClose}>Cancelar</Button>,
        <Button key="submitAdd" type="primary" onClick={handleSubmit}>Adicionar</Button>
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">Variante:</Text>
        <div style={{ fontWeight: 'bold' }}>
          {lot && buildVariantName(lot.variant, lot.product?.name)}
        </div>
      </div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="cantidad_add"
          label="Cantidad a agregar"
          rules={[{ required: true, message: 'Ingrese una cantidad válida' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddQuantityModal;
