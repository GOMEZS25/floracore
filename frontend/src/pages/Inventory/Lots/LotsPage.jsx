import React, { useState, useEffect } from 'react';
import {
  Table, Button, Input, Select, DatePicker,
  Modal, Form, InputNumber, notification, Popconfirm,
  Typography, Tag, Space, Row, Col, Checkbox, Popover, Card, Tooltip, Divider
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, SettingOutlined
} from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';

import lotService from '../../../services/lotService';

const { RangePicker } = DatePicker;
const { Option, OptGroup } = Select;
const { Text } = Typography;

const STATUS_TAG_COLOR = {
  DISPONIBLE: 'success',
  RESERVADO: 'warning',
  AGOTADO: 'error',
};

const DEFAULT_VISIBLE_COLUMNS = [
  'product_variant', 'numero_lote', 'location',
  'cantidad_disponible', 'cantidad_inicial',
  'cantidad_reservada', 'actions'
];

const ALL_COLUMNS = [
  { key: 'product_variant', title: 'Producto' },
  { key: 'numero_lote', title: 'Lote' },
  { key: 'location', title: 'Ubicación' },
  { key: 'cantidad_disponible', title: 'Disponible' },
  { key: 'cantidad_inicial', title: 'Total' },
  { key: 'cantidad_reservada', title: 'Reservado' },
  { key: 'estado', title: 'Estado' },
  { key: 'fecha_ingreso', title: 'Fecha Ingreso' },
  { key: 'notas', title: 'Notas' },
  { key: 'cantidad_cajas', title: 'Cant. Cajas' },
  { key: 'tipo_caja', title: 'Tipo Caja' },
  { key: 'ramos_por_caja', title: 'Ramos x Caja' },
  { key: 'tallos_por_ramo', title: 'Tallos x Ramo' },
  { key: 'week_number', title: 'Semana' },
  { key: 'year', title: 'Año' },
  { key: 'actions', title: 'Acciones' }
];

const getAvailabilityColor = (disponible, total) => {
  if (!total) return undefined;
  const pct = disponible / total;
  if (pct <= 0.2) return '#ff4d4f';
  if (pct <= 0.5) return '#faad14';
  return undefined;
};

const normalizeUnidad = (unidad) => {
  if (!unidad) return 'tallos';
  const up = unidad.toUpperCase();
  if (up === 'TALLO' || up.includes('TALLO')) return 'tallos';
  if (up === 'RAMO' || up.includes('RAMO')) return 'ramos';
  if (up === 'CAJA' || up.includes('CAJA')) return 'cajas';
  return 'tallos';
}

const LotsPage = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    location_id: null,
    estado: null,
    fecha_desde: null,
    fecha_hasta: null
  });

  const [variants, setVariants] = useState([]);
  const [locations, setLocations] = useState([]);
  const [companySettings, setCompanySettings] = useState({
    inventory_mode: 'TALLOS',
    show_stems_per_bunch: false,
    show_bunches_per_box: false,
    show_box_type: false
  });

  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [userId, setUserId] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingLotId, setEditingLotId] = useState(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addingLot, setAddingLot] = useState(null);

  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedBloque, setSelectedBloque] = useState(null);
  const [variantSearch, setVariantSearch] = useState('');

  const watchedCantidad = Form.useWatch('cantidad_inicial', form);
  const watchedTpr = Form.useWatch('tallos_por_ramo', form);
  const watchedRpc = Form.useWatch('ramos_por_caja', form);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const uid = decoded.id || decoded.user_id;
        setUserId(uid);
        const savedCols = localStorage.getItem(`columns_lots_${uid}`);
        if (savedCols) setVisibleColumns(JSON.parse(savedCols));
      } catch (error) {
        console.error("Invalid token", error);
      }
    }
  }, []);

  useEffect(() => { fetchLots(); }, [filters]);
  useEffect(() => { fetchAuxiliaryData(); }, []);

  const fetchAuxiliaryData = async () => {
    try {
      const [vars, locs, settings] = await Promise.all([
        lotService.getAllVariants(),
        lotService.getLocations({ is_active: true }),
        lotService.getCompanySettings()
      ]);
      setVariants(vars?.data || vars || []);
      setLocations(locs?.data || locs || []);
      if (settings?.data) setCompanySettings(settings.data);
    } catch {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los datos auxiliares.' });
    }
  };

  const fetchLots = async () => {
    setLoading(true);
    try {
      const backendFilters = {};
      if (filters.location_id) backendFilters.location_id = filters.location_id;
      if (filters.estado) backendFilters.estado = filters.estado;
      if (filters.fecha_desde) backendFilters.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) backendFilters.fecha_hasta = filters.fecha_hasta;

      const response = await lotService.getLots(backendFilters);
      let data = response?.data || response || [];

      if (filters.search) {
        const lowerSearch = filters.search.toLowerCase();
        data = data.filter(l => {
          const productName = l.product?.name?.toLowerCase() || '';
          const attributes = l.variant?.attributes?.map(a => a.value.value).join(' ').toLowerCase() || '';
          const sku = l.variant?.sku_variant?.toLowerCase() || '';
          return productName.includes(lowerSearch) || attributes.includes(lowerSearch) || sku.includes(lowerSearch);
        });
      }

      setLots(data);
    } catch {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los lotes.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (dates) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        fecha_desde: dates[0].format('YYYY-MM-DD'),
        fecha_hasta: dates[1].format('YYYY-MM-DD')
      }));
    } else {
      setFilters(prev => ({ ...prev, fecha_desde: null, fecha_hasta: null }));
    }
  };

  const toggleColumn = (key) => {
    let newCols = visibleColumns.includes(key)
      ? visibleColumns.filter(c => c !== key)
      : [...visibleColumns, key];

    if (!newCols.includes('actions')) newCols.push('actions');
    setVisibleColumns(newCols);
    if (userId) localStorage.setItem(`columns_lots_${userId}`, JSON.stringify(newCols));
  };

  const handleDelete = async (loteId) => {
    try {
      await lotService.deleteLot(loteId);
      notification.success({ message: 'Lote eliminado exitosamente' });
      fetchLots();
    } catch (error) {
      const msg = error.response?.data?.mensaje || 'No se puede eliminar el lote porque tiene movimientos asociados.';
      notification.error({ message: 'Error al eliminar', description: msg });
    }
  };

  const handleEdit = (lot) => {
    setIsEdit(true);
    setEditingLotId(lot.lote_id);
    form.setFieldsValue({
      zona_corte: lot.zona_corte,
      notas: lot.notas,
      tipo_caja: lot.tipo_caja,
      ramos_por_caja: lot.ramos_por_caja,
      tallos_por_ramo: lot.tallos_por_ramo,
      cantidad_cajas: lot.cantidad_cajas,
      week_number: lot.week_number,
      year: lot.year
    });
    setIsModalVisible(true);
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setEditingLotId(null);
    setSelectedVariant(null);
    setSelectedBloque(null);
    setVariantSearch('');

    form.resetFields();
    form.setFieldsValue({
      year: new Date().getFullYear()
    });

    setIsModalVisible(true);
  };

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

          const imode = companySettings.inventory_mode;
          payload.unidad_medida = imode === 'TALLOS' ? 'TALLO' : imode === 'RAMOS' ? 'RAMO' : 'CAJA';

          if (imode === 'CAJAS') {
            payload.cantidad_cajas = values.cantidad_inicial;
          }

          if (!companySettings.show_stems_per_bunch) delete payload.tallos_por_ramo;
          if (!companySettings.show_bunches_per_box) delete payload.ramos_por_caja;
          if (!companySettings.show_box_type) delete payload.tipo_caja;
        }

        if (isEdit) {
          await lotService.updateLot(editingLotId, payload);
          notification.success({ message: 'Lote actualizado correctamente' });
        } else {
          await lotService.createLot(payload);
          notification.success({ message: 'Lote creado correctamente' });
        }

        fetchLots();

        if (keepOpen && !isEdit) {
          const cv = form.getFieldValue('variant_id');
          const cb = form.getFieldValue('bloque_id');
          const cc = form.getFieldValue('cama_id');
          const cy = form.getFieldValue('year');
          form.resetFields();
          form.setFieldsValue({ variant_id: cv, bloque_id: cb, cama_id: cc, year: cy });
        } else {
          setIsModalVisible(false);
        }
      } catch (error) {
        notification.error({
          message: 'Error',
          description: error.response?.data?.mensaje || 'Ocurrió un error en la operación.'
        });
      }
    });
  };

  const openAddModal = (lot) => {
    setAddingLot(lot);
    addForm.resetFields();
    setIsAddModalVisible(true);
  };

  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      await lotService.addQuantity(addingLot.lote_id, values.cantidad_add);
      notification.success({ message: 'Cantidad adicionada exitosamente' });
      setIsAddModalVisible(false);
      fetchLots();
    } catch (error) {
      if (error.response) {
        notification.error({
          message: 'Error al adicionar',
          description: error.response.data?.mensaje || 'No se pudo adicionar cantidad'
        });
      }
    }
  };

  const bloqs = locations.filter(l => l.type === 'BLOQUE');
  const beds = locations.filter(l => l.type === 'CAMA');
  const visibleBeds = selectedBloque ? beds.filter(b => b.parent_id === selectedBloque) : beds;

  const groupedVariants = variants.reduce((acc, variant) => {
    const pName = variant.product?.name || "Sin Producto";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(variant);
    return acc;
  }, {});

  const buildVariantName = (v, pName) => {
    const attrStr = v.attributes?.map(a => a.value?.value).join(' ') || '';
    return `${pName} ${attrStr}`.trim();
  };

  const getQtyLabelInfo = () => {
    switch (companySettings.inventory_mode) {
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
    if (companySettings.inventory_mode === 'TALLOS') {
      resTotalTallos = watchedCantidad;
      if (watchedTpr > 0) resTotalRamos = Math.floor(watchedCantidad / watchedTpr);
      if (resTotalRamos > 0 && watchedRpc > 0) resTotalCajas = Math.floor(resTotalRamos / watchedRpc);
    } else if (companySettings.inventory_mode === 'RAMOS') {
      resTotalRamos = watchedCantidad;
      if (watchedTpr > 0) resTotalTallos = watchedCantidad * watchedTpr;
      if (watchedRpc > 0) resTotalCajas = Math.floor(watchedCantidad / watchedRpc);
    } else if (companySettings.inventory_mode === 'CAJAS') {
      resTotalCajas = watchedCantidad;
      if (watchedRpc > 0) resTotalRamos = watchedCantidad * watchedRpc;
      if (resTotalRamos > 0 && watchedTpr > 0) resTotalTallos = resTotalRamos * watchedTpr;
    }
  }

  const columnsDef = [
    {
      title: 'Producto',
      key: 'product_variant',
      render: (_, record) => {
        const pName = record.product?.name || '';
        const attrStr = record.variant?.attributes?.map(a => a.value?.value).join(' ') || '';
        const fullName = `${pName} ${attrStr}`.trim();
        const sku = record.variant?.sku_variant;
        return (
          <div>
            <Text strong style={{ fontSize: 15 }}>{fullName}</Text>
            {sku && (
              <div><Text type="secondary" style={{ fontSize: 11 }}>{sku}</Text></div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Lote',
      dataIndex: 'numero_lote',
      key: 'numero_lote',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Ubicación',
      key: 'location',
      render: (_, record) => {
        const parent = record.location?.parent?.name;
        const name = record.location?.name || 'N/A';
        return (
          <div>
            {parent && <div><Text strong style={{ fontSize: 13 }}>{parent}</Text></div>}
            <div><Text type="secondary" style={{ fontSize: 12 }}>{name}</Text></div>
          </div>
        );
      }
    },
    {
      title: 'Disponible',
      dataIndex: 'cantidad_disponible',
      key: 'cantidad_disponible',
      render: (val, record) => {
        const color = getAvailabilityColor(val, record.cantidad_inicial);
        const suf = normalizeUnidad(record.unidad_medida);
        return (
          <Text strong style={{ fontSize: 15, ...(color && { color }) }}>
            {val} {suf}
          </Text>
        );
      }
    },
    {
      title: 'Total',
      dataIndex: 'cantidad_inicial',
      key: 'cantidad_inicial',
      render: (val, record) => {
        const suf = normalizeUnidad(record.unidad_medida);
        return <Text>{val} {suf}</Text>;
      }
    },
    {
      title: 'Reservado',
      dataIndex: 'cantidad_reservada',
      key: 'cantidad_reservada',
      render: (val, record) => {
        const suf = normalizeUnidad(record.unidad_medida);
        return <Text>{val} {suf}</Text>;
      }
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (status) => (
        <Tag color={STATUS_TAG_COLOR[status] || 'default'} style={{ fontWeight: 'bold' }}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Fecha Ingreso',
      dataIndex: 'fecha_ingreso',
      key: 'fecha_ingreso',
      render: (val) => val
        ? new Date(val).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-'
    },
    { title: 'Notas', dataIndex: 'notas', key: 'notas' },
    { title: 'Cant. Cajas', dataIndex: 'cantidad_cajas', key: 'cantidad_cajas' },
    { title: 'Tipo Caja', dataIndex: 'tipo_caja', key: 'tipo_caja' },
    { title: 'Ramos x Caja', dataIndex: 'ramos_por_caja', key: 'ramos_por_caja' },
    { title: 'Tallos x Ramo', dataIndex: 'tallos_por_ramo', key: 'tallos_por_ramo' },
    { title: 'Semana', dataIndex: 'week_number', key: 'week_number' },
    { title: 'Año', dataIndex: 'year', key: 'year' },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {record.estado !== 'AGOTADO' && (
            <Tooltip title="Adicionar cantidad">
              <Button
                size="small"
                icon={<PlusOutlined />}
                style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
                onClick={() => openAddModal(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar Lote?"
              description="Esta acción no se puede deshacer"
              onConfirm={() => handleDelete(record.lote_id)}
              okText="Sí"
              cancelText="No"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const columns = columnsDef.filter(c => visibleColumns.includes(c.key));

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Typography.Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
            Inventario
          </Typography.Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{ backgroundColor: '#1a3c2e' }}
          >
            Nuevo Lote
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Buscar por producto o SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Ubicación"
              allowClear
              value={filters.location_id}
              onChange={(val) => handleFilterChange('location_id', val)}
            >
              {locations.map(loc => (
                <Option key={loc.location_id} value={loc.location_id}>{loc.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Estado"
              allowClear
              value={filters.estado}
              onChange={(val) => handleFilterChange('estado', val)}
            >
              <Option value="DISPONIBLE">DISPONIBLE</Option>
              <Option value="RESERVADO">RESERVADO</Option>
              <Option value="AGOTADO">AGOTADO</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker style={{ width: '100%' }} onChange={handleDateChange} />
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Popover
              content={
                <Space direction="vertical">
                  {ALL_COLUMNS.filter(c => c.key !== 'actions').map(col => (
                    <Checkbox
                      key={col.key}
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    >
                      {col.title}
                    </Checkbox>
                  ))}
                </Space>
              }
              title="Columnas Visibles"
              trigger="click"
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />}>Columnas</Button>
            </Popover>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={lots}
        rowKey="lote_id"
        loading={loading}
        scroll={{ x: 1000 }}
        onRow={(record) => {
          const pct = record.cantidad_inicial > 0
            ? record.cantidad_disponible / record.cantidad_inicial
            : 1;
          return pct <= 0.2 ? { style: { backgroundColor: '#fff2f0' } } : {};
        }}
        pagination={{
          pageSizeOptions: ['25', '50', '100'],
          defaultPageSize: 25,
          showSizeChanger: true,
          showTotal: (total, range) => `Mostrando ${range[0]} - ${range[1]} de ${total} lotes`,
        }}
      />

      <Modal
        title={isEdit ? "Editar Lote" : "Nuevo Lote"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={720}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
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

              {/* 2. Cantidad */}
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

              {/* 3. Campos condicionales de empaque */}
              <Row gutter={16}>
                {companySettings.show_stems_per_bunch && (
                  <Col span={8}>
                    <Form.Item name="tallos_por_ramo" label="Tallos x Ramo">
                      <InputNumber min={1} style={{ width: '100%' }} addonAfter="tallos" />
                    </Form.Item>
                  </Col>
                )}
                {companySettings.show_bunches_per_box && (
                  <Col span={8}>
                    <Form.Item name="ramos_por_caja" label="Ramos x Caja">
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
              {(companySettings.show_stems_per_bunch || companySettings.show_bunches_per_box) &&
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

          {/* 5, 6, 7. Zona de corte, Semana, Año */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="zona_corte" label="Zona de Corte">
                <Input placeholder="Ej. Zona A" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="week_number" label="Semana (1-52)">
                <InputNumber min={1} max={52} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="year" label="Año">
                <InputNumber min={2000} style={{ width: '100%' }} />
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

      <Modal
        title={`Adicionar cantidad — ${addingLot?.numero_lote}`}
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        width={380}
        destroyOnClose
        footer={[
          <Button key="cancelAdd" onClick={() => setIsAddModalVisible(false)}>Cancelar</Button>,
          <Button key="submitAdd" type="primary" onClick={handleAddSubmit}>Adicionar</Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Variante:</Text>
          <div style={{ fontWeight: 'bold' }}>
            {addingLot && buildVariantName(addingLot.variant, addingLot.product?.name)}
          </div>
        </div>
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="cantidad_add"
            label="Cantidad a agregar"
            rules={[{ required: true, message: 'Ingrese una cantidad válida' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LotsPage;
