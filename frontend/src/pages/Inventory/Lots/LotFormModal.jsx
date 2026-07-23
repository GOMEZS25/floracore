import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Button, Input, Select, InputNumber,
  Radio, Row, Col, Typography, Divider, notification
} from 'antd';
import lotService from '../../../services/lotService';

const { Option, OptGroup } = Select;
const { Text } = Typography;

const buildVariantName = (v, pName) => {
  const attrStr = v.attributes?.map(a => a.value?.value).join(' ') || '';
  return `${pName} ${attrStr}`.trim();
};

const getAllowedModes = (settings) => {
  const modes = ['TALLOS'];
  if (settings.show_stems_per_bunch) modes.push('RAMOS');
  if (settings.show_stems_per_bunch && settings.show_bunches_per_box) modes.push('CAJAS');
  return modes;
};

const LotFormModal = ({ open, isEdit, editingLot, variants, locations, companySettings, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedBloque, setSelectedBloque] = useState(null);
  const [variantSearch, setVariantSearch] = useState('');
  const [packagingMode, setPackagingMode] = useState(() => {
    const allowed = getAllowedModes(companySettings);
    return allowed.includes(companySettings.inventory_mode) ? companySettings.inventory_mode : 'TALLOS';
  });

  const watchedCantidad = Form.useWatch('cantidad_inicial', form);
  const watchedTpr = Form.useWatch('tallos_por_ramo', form);
  const watchedRpc = Form.useWatch('ramos_por_caja', form);

  useEffect(() => {
    if (!open) return;
    if (isEdit && editingLot) {
      form.setFieldsValue({
        zona_corte: editingLot.zona_corte,
        notas: editingLot.notas,
        tipo_caja: editingLot.tipo_caja,
        ramos_por_caja: editingLot.ramos_por_caja,
        tallos_por_ramo: editingLot.tallos_por_ramo,
        cantidad_cajas: editingLot.cantidad_cajas
      });
    } else {
      setSelectedVariant(null);
      setSelectedBloque(null);
      setVariantSearch('');
      const allowed = getAllowedModes(companySettings);
      setPackagingMode(allowed.includes(companySettings.inventory_mode) ? companySettings.inventory_mode : 'TALLOS');
      form.resetFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, editingLot]);

  const bloqs = locations.filter(l => l.type === 'BLOQUE');
  const beds = locations.filter(l => l.type === 'CAMA');
  const visibleBeds = selectedBloque ? beds.filter(b => b.parent_id === selectedBloque) : beds;

  const groupedVariants = variants.reduce((acc, variant) => {
    const pName = variant.product?.name || "Sin Producto";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(variant);
    return acc;
  }, {});

  const getQtyLabelInfo = () => {
    switch (packagingMode) {
      case 'RAMOS': return { label: 'Cantidad de ramos', suffix: 'ramos' };
      case 'CAJAS': return { label: 'Cantidad de cajas', suffix: 'cajas' };
      case 'TALLOS':
      default: return { label: 'Cantidad de tallos', suffix: 'tallos' };
    }
  };

  const qtyInfo = getQtyLabelInfo();

  let resTotalTallos = null;
  let resTotalRamos = null;
  let resTotalCajas = null;

  if (watchedCantidad > 0) {
    if (packagingMode === 'TALLOS') {
      resTotalTallos = watchedCantidad;
      if (watchedTpr > 0) resTotalRamos = Math.floor(watchedCantidad / watchedTpr);
      if (resTotalRamos > 0 && watchedRpc > 0) resTotalCajas = Math.floor(resTotalRamos / watchedRpc);
    } else if (packagingMode === 'RAMOS') {
      resTotalRamos = watchedCantidad;
      if (watchedTpr > 0) resTotalTallos = watchedCantidad * watchedTpr;
      if (watchedRpc > 0) resTotalCajas = Math.floor(watchedCantidad / watchedRpc);
    } else if (packagingMode === 'CAJAS') {
      resTotalCajas = watchedCantidad;
      if (watchedRpc > 0) resTotalRamos = watchedCantidad * watchedRpc;
      if (resTotalRamos > 0 && watchedTpr > 0) resTotalTallos = resTotalRamos * watchedTpr;
    }
  }

  const onModalOk = (keepOpen) => {
    form.validateFields().then(async (values) => {
      try {
        const locId = values.cama_id || values.bloque_id || null;

        const payload = { ...values };
        if (!isEdit) {
          payload.location_id = locId;
          delete payload.bloque_id;
          delete payload.cama_id;

          const v = variants.find(vr => vr.variant_id === values.variant_id);
          payload.product_id = v?.product_id || v?.product?.product_id;

          const imode = packagingMode;
          payload.unidad_medida = imode === 'TALLOS' ? 'TALLO' : imode === 'RAMOS' ? 'RAMO' : 'CAJA';

          if (imode === 'CAJAS') {
            payload.cantidad_cajas = values.cantidad_inicial;
          }

          if (imode !== 'RAMOS' && imode !== 'CAJAS') delete payload.tallos_por_ramo;
          if (imode !== 'CAJAS') delete payload.ramos_por_caja;
          if (!companySettings.show_box_type) delete payload.tipo_caja;
        }

        if (isEdit) {
          await lotService.updateLot(editingLot.lote_id, payload);
          notification.success({ message: 'Lote actualizado correctamente' });
        } else {
          await lotService.createLot(payload);
          notification.success({ message: 'Lote creado correctamente' });
        }

        onSuccess();

        if (keepOpen && !isEdit) {
          const cv = form.getFieldValue('variant_id');
          const cb = form.getFieldValue('bloque_id');
          const cc = form.getFieldValue('cama_id');
          const cy = form.getFieldValue('year');
          form.resetFields();
          form.setFieldsValue({ variant_id: cv, bloque_id: cb, cama_id: cc, year: cy });
        } else {
          onClose();
        }
      } catch (error) {
        notification.error({
          message: 'Error',
          description: error.response?.data?.mensaje || 'Ocurrió un error en la operación.'
        });
      }
    }).catch(() => {});
  };

  return (
    <Modal
      title={isEdit ? "Editar Lote" : "Nuevo Lote"}
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        ...(!isEdit ? [
          <Button key="saveNew" onClick={() => onModalOk(true)}>
            Guardar y Nuevo
          </Button>
        ] : []),
        <Button key="saveClose" type="primary" onClick={() => onModalOk(false)} style={{ backgroundColor: '#1a3c2e' }}>
          Guardar y Cerrar
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        {!isEdit && (
          <>
            {/* 1. Variante */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="variant_id"
                  label="Variante"
                  rules={[{ required: true, message: 'La variante es requerida' }]}
                >
                  <Select
                    showSearch
                    placeholder="Escribe para buscar..."
                    onSearch={setVariantSearch}
                    optionLabelProp="label"
                    onChange={(val) => {
                      setSelectedVariant(variants.find(vr => String(vr.variant_id) === String(val)));
                      setVariantSearch('');
                    }}
                    filterOption={false}
                  >
                    {variantSearch.length < 2 ? (
                      selectedVariant ? (
                        <Option
                          key={String(selectedVariant.variant_id)}
                          value={String(selectedVariant.variant_id)}
                          label={buildVariantName(selectedVariant, selectedVariant.product?.name || "Sin Producto")}
                        >
                          {buildVariantName(selectedVariant, selectedVariant.product?.name || "Sin Producto")}
                        </Option>
                      ) : (
                        <Option disabled key="empty" value="empty">Escribe mínimo 2 caracteres...</Option>
                      )
                    ) : (
                      Object.entries(groupedVariants).map(([pName, vars]) => {
                        const searchedStr = variantSearch.toLowerCase();
                        const filtered = vars.filter(v =>
                          buildVariantName(v, pName).toLowerCase().includes(searchedStr)
                        );
                        if (filtered.length === 0) return null;
                        return (
                          <OptGroup key={pName} label={pName}>
                            {filtered.map(v => (
                              <Option
                                key={String(v.variant_id)}
                                value={String(v.variant_id)}
                                label={buildVariantName(v, pName)}
                              >
                                {buildVariantName(v, pName)}
                              </Option>
                            ))}
                          </OptGroup>
                        );
                      })
                    )}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 2. Modo de Ingreso */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Modo de Ingreso</Text>
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  value={packagingMode}
                  onChange={(e) => setPackagingMode(e.target.value)}
                >
                  <Radio.Button value="TALLOS">Tallos</Radio.Button>
                  {companySettings.show_stems_per_bunch && (
                    <Radio.Button value="RAMOS">Ramos</Radio.Button>
                  )}
                  {companySettings.show_stems_per_bunch && companySettings.show_bunches_per_box && (
                    <Radio.Button value="CAJAS">Cajas</Radio.Button>
                  )}
                </Radio.Group>
              </Col>
            </Row>

            {/* 3. Cantidad */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="cantidad_inicial"
                  label={qtyInfo.label}
                  rules={[{ required: true, message: 'Campo requerido' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} addonAfter={qtyInfo.suffix} />
                </Form.Item>
              </Col>
            </Row>

            {/* 4. Campos condicionales de empaque */}
            <Row gutter={16}>
              {(packagingMode === 'RAMOS' || packagingMode === 'CAJAS') && (
                <Col span={8}>
                  <Form.Item
                    name="tallos_por_ramo"
                    label="Tallos x Ramo"
                    rules={[{ required: true, message: 'Campo requerido' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} addonAfter="tallos" />
                  </Form.Item>
                </Col>
              )}
              {packagingMode === 'CAJAS' && (
                <Col span={8}>
                  <Form.Item
                    name="ramos_por_caja"
                    label="Ramos x Caja"
                    rules={[{ required: true, message: 'Campo requerido' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} addonAfter="ramos" />
                  </Form.Item>
                </Col>
              )}
              {companySettings.show_box_type && (
                <Col span={8}>
                  <Form.Item name="tipo_caja" label="Tipo de Caja">
                    <Select placeholder="Seleccionar tipo" allowClear>
                      <Option value="QUARTER_BOX">Quarter Box</Option>
                      <Option value="HALF_BOX">Half Box</Option>
                      <Option value="FULL_BOX">Full Box</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Resumen dinámico */}
            {packagingMode !== 'TALLOS' &&
              (resTotalTallos !== null || resTotalRamos !== null || resTotalCajas !== null) && (
                <>
                  <Divider style={{ margin: '12px 0' }} orientation="left">Real calculada</Divider>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    {resTotalTallos !== null && (
                      <Col>
                        <Text type="secondary">Total tallos:</Text> <Text strong>{resTotalTallos}</Text>
                      </Col>
                    )}
                    {resTotalRamos !== null && (
                      <Col>
                        <Text type="secondary" style={{ marginLeft: 16 }}>Total ramos:</Text> <Text strong>{resTotalRamos}</Text>
                      </Col>
                    )}
                    {resTotalCajas !== null && (
                      <Col>
                        <Text type="secondary" style={{ marginLeft: 16 }}>Total cajas:</Text> <Text strong>{resTotalCajas}</Text>
                      </Col>
                    )}
                  </Row>
                </>
              )}

            {/* 4. Bloque y Cama */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="bloque_id" label="Bloque">
                  <Select
                    placeholder="Seleccionar (Opcional)"
                    allowClear
                    onChange={(val) => {
                      setSelectedBloque(val);
                      form.setFieldsValue({ cama_id: undefined });
                    }}
                  >
                    {bloqs.map(b => <Option key={b.location_id} value={b.location_id}>{b.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cama_id" label="Cama">
                  <Select placeholder="Seleccionar (Opcional)" allowClear>
                    {visibleBeds.map(c => <Option key={c.location_id} value={c.location_id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {isEdit && (
          <Row gutter={16}>
            {companySettings.show_bunches_per_box && (
              <Col span={8}>
                <Form.Item name="ramos_por_caja" label="Ramos x Caja">
                  <InputNumber min={0} style={{ width: '100%' }} addonAfter="ramos" />
                </Form.Item>
              </Col>
            )}
            {companySettings.show_stems_per_bunch && (
              <Col span={8}>
                <Form.Item name="tallos_por_ramo" label="Tallos x Ramo">
                  <InputNumber min={0} style={{ width: '100%' }} addonAfter="tallos" />
                </Form.Item>
              </Col>
            )}
            {companySettings.show_box_type && (
              <Col span={8}>
                <Form.Item name="tipo_caja" label="Tipo de Caja">
                  <Select placeholder="Seleccionar..." allowClear>
                    <Option value="QUARTER_BOX">Quarter Box</Option>
                    <Option value="HALF_BOX">Half Box</Option>
                    <Option value="FULL_BOX">Full Box</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>
        )}

        {/* 5. Zona de corte */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="zona_corte" label="Zona de Corte">
              <Input placeholder="Ej. Zona A" />
            </Form.Item>
          </Col>
        </Row>

        {/* 8. Notas */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="notas" label="Notas">
              <Input.TextArea rows={3} placeholder="Notas adicionales..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default LotFormModal;
