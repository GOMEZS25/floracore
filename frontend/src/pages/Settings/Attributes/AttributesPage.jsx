import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Row,
  Col,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Badge,
  Tag,
  Table,
  Tooltip,
  Popconfirm,
  Empty,
  notification,
  Divider,
  Checkbox,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  TagsOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  toggleAttribute,
  getAttributeValues,
  createAttributeValue,
  toggleAttributeValue,
  deleteAttributeValue,
} from '../../../services/attributeService';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#1a3c2e';
const ACTIVE_COLOR = '#52b788';
const SELECTED_BG = '#f0f7f2';
const SELECTED_BORDER = '#1a3c2e';

const AttributesPage = () => {

  const [attributes, setAttributes] = useState([]);
  const [loadingAttrs, setLoadingAttrs] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputStatus, setInputStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ name: '', is_active: '' });

  const [selectedAttr, setSelectedAttr] = useState(null);
  const [checkedAttrs, setCheckedAttrs] = useState(new Set());
  const [bulkLoadingAttrs, setBulkLoadingAttrs] = useState(false);

  const [editingAttrId, setEditingAttrId] = useState(null);
  const [editingAttrName, setEditingAttrName] = useState('');
  const [savingAttrName, setSavingAttrName] = useState(false);

  const [newAttrName, setNewAttrName] = useState('');
  const [creatingAttr, setCreatingAttr] = useState(false);
  const [showNewAttrInput, setShowNewAttrInput] = useState(false);

  const [values, setValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [valueSearch, setValueSearch] = useState('');
  const [valueStatus, setValueStatus] = useState('');
  const [valuePaginationSize, setValuePaginationSize] = useState(25);
  const [valuePage, setValuePage] = useState(1);

  const [newValueText, setNewValueText] = useState('');
  const [creatingValue, setCreatingValue] = useState(false);

  const [checkedValues, setCheckedValues] = useState([]);
  const [bulkLoadingValues, setBulkLoadingValues] = useState(false);

  const newAttrInputRef = useRef(null);
  const newValueInputRef = useRef(null);

  const fetchAttributes = useCallback(async (filters) => {
    setLoadingAttrs(true);
    try {
      const data = await getAttributes(filters);
      const list = Array.isArray(data) ? data : (data.data ?? data.attributes ?? []);
      setAttributes(list);
      setCheckedAttrs(new Set());
    } catch (err) {
      notification.error({
        message: 'Error al cargar atributos',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setLoadingAttrs(false);
    }
  }, []);

  useEffect(() => {
    fetchAttributes(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchValues = useCallback(async (attrId) => {
    setLoadingValues(true);
    setCheckedValues([]);
    try {
      const data = await getAttributeValues(attrId);
      const list = Array.isArray(data) ? data : (data.data ?? data.values ?? []);
      setValues(list);
    } catch (err) {
      notification.error({
        message: 'Error al cargar valores',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setLoadingValues(false);
    }
  }, []);

  const handleSelectAttr = (attr) => {
    setEditingAttrId(null);
    setEditingAttrName('');

    if (selectedAttr && String(selectedAttr.attribute_id) === String(attr.attribute_id)) {
      setSelectedAttr(null);
      setValues([]);
      return;
    }
    setSelectedAttr(attr);
    setValueSearch('');
    setValueStatus('');
    setValuePage(1);
    fetchValues(attr.attribute_id);
  };

  const handleSearchAttrs = () => {
    const filters = { name: inputName.trim(), is_active: inputStatus };
    setAppliedFilters(filters);
    fetchAttributes(filters);
  };

  const handleClearAttrs = () => {
    setInputName('');
    setInputStatus('');
    const filters = { name: '', is_active: '' };
    setAppliedFilters(filters);
    fetchAttributes(filters);
  };

  const handleCreateAttr = async () => {
    const name = newAttrName.trim();
    if (!name) return;
    setCreatingAttr(true);
    try {
      await createAttribute({ name });
      notification.success({ message: 'Atributo creado correctamente' });
      setNewAttrName('');
      setShowNewAttrInput(false);
      fetchAttributes(appliedFilters);
    } catch (err) {
      notification.error({
        message: 'Error al crear atributo',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setCreatingAttr(false);
    }
  };

  const startEditAttr = (e, attr) => {
    e.stopPropagation();
    setEditingAttrId(String(attr.attribute_id));
    setEditingAttrName(attr.name);
  };

  const cancelEditAttr = (e) => {
    if (e) e.stopPropagation();
    setEditingAttrId(null);
    setEditingAttrName('');
  };

  const saveEditAttr = async (e, attr) => {
    if (e) e.stopPropagation();
    const name = editingAttrName.trim();
    if (!name || name === attr.name) {
      cancelEditAttr();
      return;
    }
    setSavingAttrName(true);
    try {
      await updateAttribute(attr.attribute_id, { name });
      notification.success({ message: 'Nombre actualizado' });
      setAttributes((prev) =>
        prev.map((a) =>
          String(a.attribute_id) === String(attr.attribute_id) ? { ...a, name } : a
        )
      );
      if (selectedAttr && String(selectedAttr.attribute_id) === String(attr.attribute_id)) {
        setSelectedAttr((prev) => ({ ...prev, name }));
      }
      setEditingAttrId(null);
      setEditingAttrName('');
    } catch (err) {
      notification.error({
        message: 'Error al actualizar nombre',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setSavingAttrName(false);
    }
  };

  const handleToggleAttr = async (e, attr) => {
    e.stopPropagation();
    try {
      await toggleAttribute(attr.attribute_id);
      notification.success({
        message: `Atributo ${attr.is_active ? 'inactivado' : 'activado'} correctamente`,
      });
      fetchAttributes(appliedFilters);
      if (selectedAttr && String(selectedAttr.attribute_id) === String(attr.attribute_id)) {
        setSelectedAttr((prev) => ({ ...prev, is_active: !prev.is_active }));
      }
    } catch (err) {
      notification.error({
        message: 'Error al cambiar estado',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    }
  };

  const toggleCheckAttr = (e, id) => {
    e.stopPropagation();
    setCheckedAttrs((prev) => {
      const next = new Set(prev);
      next.has(String(id)) ? next.delete(String(id)) : next.add(String(id));
      return next;
    });
  };

  const handleBulkAttrs = async (action) => {
    setBulkLoadingAttrs(true);
    const errors = [];
    let targetIds = [...checkedAttrs];

    if (action === 'activate') {
      const inactiveIds = new Set(
        attributes.filter((a) => !a.is_active).map((a) => String(a.attribute_id))
      );
      targetIds = targetIds.filter((id) => inactiveIds.has(id));
    } else if (action === 'deactivate') {
      const activeIds = new Set(
        attributes.filter((a) => a.is_active).map((a) => String(a.attribute_id))
      );
      targetIds = targetIds.filter((id) => activeIds.has(id));
    }

    if (targetIds.length === 0) {
      setBulkLoadingAttrs(false);
      notification.info({ message: 'Sin cambios necesarios' });
      return;
    }

    await Promise.allSettled(
      targetIds.map(async (id) => {
        try {
          await toggleAttribute(id);
        } catch (err) {
          errors.push(err);
        }
      })
    );

    setBulkLoadingAttrs(false);
    if (errors.length === 0) {
      const msg = action === 'activate' ? 'activados' : 'inactivados';
      notification.success({ message: `${targetIds.length} atributo(s) ${msg} correctamente` });
    } else {
      notification.warning({
        message: 'Algunas acciones fallaron',
        description: `${errors.length} operación(es) no pudieron completarse.`,
      });
    }
    fetchAttributes(appliedFilters);
  };

  const handleCreateValue = async () => {
    if (!selectedAttr) return;
    const value = newValueText.trim();
    if (!value) return;
    setCreatingValue(true);
    try {
      await createAttributeValue(selectedAttr.attribute_id, { value });
      notification.success({ message: 'Valor agregado correctamente' });
      setNewValueText('');
      fetchValues(selectedAttr.attribute_id);
    } catch (err) {
      notification.error({
        message: 'Error al agregar valor',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setCreatingValue(false);
    }
  };

  const handleToggleValue = async (valueRecord) => {
    try {
      await toggleAttributeValue(selectedAttr.attribute_id, valueRecord.value_id);
      notification.success({
        message: `Valor ${valueRecord.is_active ? 'inactivado' : 'activado'} correctamente`,
      });
      fetchValues(selectedAttr.attribute_id);
    } catch (err) {
      notification.error({
        message: 'Error al cambiar estado del valor',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    }
  };

  const handleDeleteValue = async (valueRecord) => {
    try {
      await deleteAttributeValue(selectedAttr.attribute_id, valueRecord.value_id);
      notification.success({ message: 'Valor eliminado correctamente' });
      fetchValues(selectedAttr.attribute_id);
    } catch (err) {
      notification.error({
        message: 'Error al eliminar valor',
        description:
          err?.response?.data?.mensaje ||
          err?.response?.data?.message ||
          'No se pudo eliminar. Puede tener asociaciones.',
      });
    }
  };

  const handleBulkValues = async (action) => {
    setBulkLoadingValues(true);
    const errors = [];

    let targetIds = [...checkedValues];
    if (action === 'activate') {
      const inactiveIds = new Set(
        values.filter((v) => !v.is_active).map((v) => String(v.value_id))
      );
      targetIds = targetIds.filter((id) => inactiveIds.has(id));
    } else if (action === 'deactivate') {
      const activeIds = new Set(
        values.filter((v) => v.is_active).map((v) => String(v.value_id))
      );
      targetIds = targetIds.filter((id) => activeIds.has(id));
    }

    if (action !== 'delete' && targetIds.length === 0) {
      setBulkLoadingValues(false);
      notification.info({ message: 'Sin cambios necesarios' });
      return;
    }

    await Promise.allSettled(
      (action === 'delete' ? checkedValues : targetIds).map(async (id) => {
        try {
          if (action === 'delete') await deleteAttributeValue(selectedAttr.attribute_id, id);
          else await toggleAttributeValue(selectedAttr.attribute_id, id);
        } catch (err) {
          errors.push(err);
        }
      })
    );

    setBulkLoadingValues(false);
    if (errors.length === 0) {
      const msg =
        action === 'delete' ? 'eliminados' : action === 'activate' ? 'activados' : 'inactivados';
      const count = action === 'delete' ? checkedValues.length : targetIds.length;
      notification.success({ message: `${count} valor(es) ${msg} correctamente` });
    } else {
      notification.warning({
        message: 'Algunas acciones fallaron',
        description: `${errors.length} operación(es) no pudieron completarse.`,
      });
    }
    setCheckedValues([]);
    fetchValues(selectedAttr.attribute_id);
  };

  const filteredValues = values.filter((v) => {
    const matchText = valueSearch
      ? (v.value ?? '').toLowerCase().includes(valueSearch.toLowerCase())
      : true;
    const matchStatus =
      valueStatus === 'active'
        ? v.is_active
        : valueStatus === 'inactive'
          ? !v.is_active
          : true;
    return matchText && matchStatus;
  });

  const activeCount = values.filter((v) => v.is_active).length;

  const valueColumns = [
    {
      title: 'Valor',
      dataIndex: 'value',
      key: 'value',
      sorter: (a, b) => (a.value ?? '').localeCompare(b.value ?? ''),
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 110,
      align: 'center',
      render: (active) =>
        active ? (
          <Tag color="success" style={{ fontWeight: 600, minWidth: 72, textAlign: 'center' }}>
            Activo
          </Tag>
        ) : (
          <Tag color="error" style={{ fontWeight: 600, minWidth: 72, textAlign: 'center' }}>
            Inactivo
          </Tag>
        ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title={record.is_active ? 'Inactivar' : 'Activar'}>
            <Button
              size="small"
              icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleValue(record)}
              style={
                record.is_active
                  ? { borderColor: '#faad14', color: '#faad14' }
                  : { borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR }
              }
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este valor?"
            description="Esta acción no se puede deshacer."
            okText="Eliminar"
            okType="danger"
            cancelText="Cancelar"
            onConfirm={() => handleDeleteValue(record)}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const valueRowSelection = {
    selectedRowKeys: checkedValues,
    onChange: (keys) => setCheckedValues(keys),
    columnWidth: 40,
  };

  return (
    <div style={{ padding: '4px 0' }}>
      <Row align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title
            level={3}
            style={{ margin: 0, color: PRIMARY, fontFamily: "'Inter', sans-serif" }}
          >
            Atributos de Productos
          </Title>
        </Col>
      </Row>

      <Row gutter={0} style={{ minHeight: 600 }}>
        {/* PANEL IZQUIERDO — ATRIBUTOS */}
        <Col
          xs={24}
          md={10}
          style={{
            background: '#fff',
            borderRadius: '12px 0 0 12px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1.5px solid #e8f0eb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 18px 12px',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
              <Col>
                <Text strong style={{ fontSize: 15, color: PRIMARY }}>
                  Atributos
                </Text>
              </Col>
              <Col>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setShowNewAttrInput(true);
                    setTimeout(() => newAttrInputRef.current?.focus(), 50);
                  }}
                  style={{
                    background: PRIMARY,
                    borderColor: PRIMARY,
                    fontWeight: 600,
                    borderRadius: 7,
                  }}
                >
                  Nuevo Atributo
                </Button>
              </Col>
            </Row>

            {showNewAttrInput && (
              <div style={{ marginBottom: 10 }}>
                <Input
                  ref={newAttrInputRef}
                  placeholder="Nombre del atributo"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateAttr();
                    if (e.key === 'Escape') {
                      setShowNewAttrInput(false);
                      setNewAttrName('');
                    }
                  }}
                  suffix={
                    creatingAttr ? (
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                    ) : (
                      <Space size={4}>
                        <CheckOutlined
                          style={{ color: PRIMARY, cursor: 'pointer' }}
                          onClick={handleCreateAttr}
                        />
                        <CloseOutlined
                          style={{ color: '#aaa', cursor: 'pointer' }}
                          onClick={() => {
                            setShowNewAttrInput(false);
                            setNewAttrName('');
                          }}
                        />
                      </Space>
                    )
                  }
                  style={{ borderRadius: 7 }}
                />
              </div>
            )}

            <Row gutter={[8, 8]} align="middle">
              <Col flex="1">
                <Input
                  placeholder="Buscar por nombre"
                  prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchAttrs(); }}
                  allowClear
                  style={{ borderRadius: 7 }}
                />
              </Col>
              <Col>
                <Select
                  placeholder="Estado"
                  value={inputStatus || undefined}
                  onChange={(val) => setInputStatus(val ?? '')}
                  allowClear
                  style={{ width: 110, borderRadius: 7 }}
                >
                  <Option value="">Todos</Option>
                  <Option value="true">Activos</Option>
                  <Option value="false">Inactivos</Option>
                </Select>
              </Col>
              <Col>
                <Space size={4}>
                  <Button
                    size="small"
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearchAttrs}
                    style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 7 }}
                  />
                  <Button
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={handleClearAttrs}
                    style={{ borderRadius: 7 }}
                  />
                </Space>
              </Col>
            </Row>
          </div>

          <div style={{ padding: '8px 18px 4px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {attributes.length} {attributes.length === 1 ? 'atributo' : 'atributos'}
            </Text>
          </div>

          {checkedAttrs.size > 0 && (
            <div
              style={{
                margin: '0 12px 8px',
                background: '#f0f7f4',
                border: `1.5px solid ${ACTIVE_COLOR}`,
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Badge count={checkedAttrs.size} style={{ backgroundColor: PRIMARY }} />
              <Text strong style={{ fontSize: 12, color: PRIMARY }}>
                {checkedAttrs.size} seleccionado(s)
              </Text>
              <Space size={6} style={{ marginLeft: 'auto' }}>
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={bulkLoadingAttrs}
                  onClick={() => handleBulkAttrs('activate')}
                  style={{
                    borderColor: ACTIVE_COLOR,
                    color: ACTIVE_COLOR,
                    fontWeight: 600,
                    borderRadius: 6,
                  }}
                >
                  Activar
                </Button>
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  loading={bulkLoadingAttrs}
                  onClick={() => handleBulkAttrs('deactivate')}
                  style={{
                    borderColor: '#faad14',
                    color: '#faad14',
                    fontWeight: 600,
                    borderRadius: 6,
                  }}
                >
                  Inactivar
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => setCheckedAttrs(new Set())}
                  style={{ borderRadius: 6 }}
                />
              </Space>
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 12px 12px',
            }}
          >
            {loadingAttrs ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: PRIMARY }} spin />} />
              </div>
            ) : attributes.length === 0 ? (
              <Empty
                description="No se encontraron atributos"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginTop: 40 }}
              />
            ) : (
              attributes.map((attr) => {
                const isSelected =
                  selectedAttr && String(selectedAttr.attribute_id) === String(attr.attribute_id);
                const isChecked = checkedAttrs.has(String(attr.attribute_id));
                const isEditing = editingAttrId === String(attr.attribute_id);

                return (
                  <div
                    key={String(attr.attribute_id)}
                    onClick={() => !isEditing && handleSelectAttr(attr)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      marginBottom: 6,
                      borderRadius: 9,
                      cursor: isEditing ? 'default' : 'pointer',
                      border: isSelected
                        ? `2px solid ${SELECTED_BORDER}`
                        : '2px solid #e8e8e8',
                      borderLeft: isSelected
                        ? `4px solid ${SELECTED_BORDER}`
                        : '4px solid transparent',
                      background: isSelected ? SELECTED_BG : '#fafafa',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(26,60,46,0.10)' : 'none',
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => toggleCheckAttr(e, attr.attribute_id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <Input
                          size="small"
                          value={editingAttrName}
                          autoFocus
                          onChange={(e) => setEditingAttrName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditAttr(e, attr);
                            if (e.key === 'Escape') cancelEditAttr(e);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          suffix={
                            savingAttrName ? (
                              <Spin
                                indicator={
                                  <LoadingOutlined style={{ fontSize: 12 }} spin />
                                }
                              />
                            ) : (
                              <Space size={2}>
                                <CheckOutlined
                                  style={{ color: PRIMARY, fontSize: 12, cursor: 'pointer' }}
                                  onClick={(e) => saveEditAttr(e, attr)}
                                />
                                <CloseOutlined
                                  style={{ color: '#aaa', fontSize: 12, cursor: 'pointer' }}
                                  onClick={cancelEditAttr}
                                />
                              </Space>
                            )
                          }
                          style={{ borderRadius: 6 }}
                        />
                      ) : (
                        <Row align="middle" justify="space-between" wrap={false}>
                          <Col flex="1" style={{ minWidth: 0 }}>
                            <Text
                              strong
                              ellipsis
                              style={{ color: isSelected ? PRIMARY : '#222', fontSize: 13 }}
                            >
                              {attr.name}
                            </Text>
                            <div style={{ marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                              <Tag
                                color={attr.is_active ? 'success' : 'error'}
                                style={{ fontSize: 11, lineHeight: '16px', padding: '0 6px' }}
                              >
                                {attr.is_active ? 'Activo' : 'Inactivo'}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                <TagsOutlined /> {attr._count?.values ?? attr.valuesCount ?? 0} valores
                              </Text>
                            </div>
                          </Col>
                          <Col>
                            <Space size={4} onClick={(e) => e.stopPropagation()}>
                              <Tooltip title="Editar nombre">
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={(e) => startEditAttr(e, attr)}
                                  style={{ borderColor: PRIMARY, color: PRIMARY, borderRadius: 6 }}
                                />
                              </Tooltip>
                              <Tooltip title={attr.is_active ? 'Inactivar' : 'Activar'}>
                                <Button
                                  size="small"
                                  icon={attr.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                                  onClick={(e) => handleToggleAttr(e, attr)}
                                  style={
                                    attr.is_active
                                      ? { borderColor: '#faad14', color: '#faad14', borderRadius: 6 }
                                      : { borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR, borderRadius: 6 }
                                  }
                                />
                              </Tooltip>
                            </Space>
                          </Col>
                        </Row>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Col>

        {/* PANEL DERECHO — VALORES */}
        <Col
          xs={24}
          md={14}
          style={{
            background: '#fafcfa',
            borderRadius: '0 12px 12px 0',
            boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {!selectedAttr ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
              }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#888', fontSize: 14 }}>
                    Selecciona un atributo para ver sus valores
                  </span>
                }
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '16px 20px 12px',
                  borderBottom: '1px solid #e8f0eb',
                  background: '#fff',
                }}
              >
                <Row align="middle" justify="space-between" style={{ marginBottom: 8 }}>
                  <Col>
                    <Text strong style={{ fontSize: 15, color: PRIMARY }}>
                      Valores de:{' '}
                      <span style={{ fontWeight: 700, color: PRIMARY }}>{selectedAttr.name}</span>
                    </Text>
                    <div style={{ marginTop: 3 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {activeCount} activos de {values.length} totales
                      </Text>
                    </div>
                  </Col>
                </Row>

                <Input
                  ref={newValueInputRef}
                  placeholder="Escribe un nuevo valor y presiona Enter"
                  value={newValueText}
                  onChange={(e) => setNewValueText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateValue();
                  }}
                  suffix={
                    creatingValue ? (
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                    ) : (
                      <Tooltip title="Agregar">
                        <PlusOutlined
                          style={{
                            color: newValueText.trim() ? PRIMARY : '#bbb',
                            cursor: 'pointer',
                          }}
                          onClick={handleCreateValue}
                        />
                      </Tooltip>
                    )
                  }
                  style={{ borderRadius: 8 }}
                />
              </div>

              <div
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid #eef2ef',
                  background: '#fff',
                }}
              >
                <Row gutter={[8, 8]} align="middle">
                  <Col flex="1">
                    <Input
                      placeholder="Buscar valor"
                      prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                      value={valueSearch}
                      onChange={(e) => {
                        setValueSearch(e.target.value);
                        setValuePage(1);
                      }}
                      allowClear
                      style={{ borderRadius: 7 }}
                    />
                  </Col>
                  <Col>
                    <Select
                      placeholder="Estado"
                      value={valueStatus || undefined}
                      onChange={(val) => {
                        setValueStatus(val ?? '');
                        setValuePage(1);
                      }}
                      allowClear
                      style={{ width: 120, borderRadius: 7 }}
                    >
                      <Option value="">Todos</Option>
                      <Option value="active">Activos</Option>
                      <Option value="inactive">Inactivos</Option>
                    </Select>
                  </Col>
                  <Col>
                    <Select
                      value={valuePaginationSize}
                      onChange={(val) => {
                        setValuePaginationSize(val);
                        setValuePage(1);
                      }}
                      style={{ width: 80 }}
                    >
                      <Option value={25}>25</Option>
                      <Option value={50}>50</Option>
                      <Option value={100}>100</Option>
                    </Select>
                  </Col>
                </Row>
              </div>

              {checkedValues.length > 0 && (
                <div
                  style={{
                    margin: '8px 16px',
                    background: '#f0f7f4',
                    border: `1.5px solid ${ACTIVE_COLOR}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <Badge count={checkedValues.length} style={{ backgroundColor: PRIMARY }} />
                  <Text strong style={{ fontSize: 12, color: PRIMARY }}>
                    {checkedValues.length} seleccionado(s)
                  </Text>
                  <Divider type="vertical" style={{ borderColor: ACTIVE_COLOR }} />
                  <Space size={6} wrap>
                    <Button
                      size="small"
                      icon={<CheckOutlined />}
                      loading={bulkLoadingValues}
                      onClick={() => handleBulkValues('activate')}
                      style={{
                        borderColor: ACTIVE_COLOR,
                        color: ACTIVE_COLOR,
                        fontWeight: 600,
                        borderRadius: 6,
                      }}
                    >
                      Activar
                    </Button>
                    <Button
                      size="small"
                      icon={<StopOutlined />}
                      loading={bulkLoadingValues}
                      onClick={() => handleBulkValues('deactivate')}
                      style={{
                        borderColor: '#faad14',
                        color: '#faad14',
                        fontWeight: 600,
                        borderRadius: 6,
                      }}
                    >
                      Inactivar
                    </Button>
                    <Popconfirm
                      title={`¿Eliminar ${checkedValues.length} valor(es)?`}
                      description="Esta acción no se puede deshacer."
                      okText="Eliminar"
                      okType="danger"
                      cancelText="Cancelar"
                      onConfirm={() => handleBulkValues('delete')}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={bulkLoadingValues}
                        style={{ fontWeight: 600, borderRadius: 6 }}
                      >
                        Eliminar
                      </Button>
                    </Popconfirm>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setCheckedValues([])}
                      style={{ borderRadius: 6 }}
                    >
                      Limpiar
                    </Button>
                  </Space>
                </div>
              )}

              <div style={{ flex: 1, padding: '8px 16px 16px', overflowY: 'auto' }}>
                <Table
                  rowKey={(r) => String(r.value_id)}
                  columns={valueColumns}
                  dataSource={filteredValues}
                  loading={{
                    spinning: loadingValues,
                    indicator: <LoadingOutlined style={{ fontSize: 22, color: PRIMARY }} spin />,
                  }}
                  rowSelection={valueRowSelection}
                  size="small"
                  pagination={{
                    current: valuePage,
                    pageSize: valuePaginationSize,
                    total: filteredValues.length,
                    onChange: (page) => setValuePage(page),
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
                    simple: false,
                    style: { marginTop: 8 },
                  }}
                  style={{
                    background: '#fff',
                    borderRadius: 10,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          valueSearch || valueStatus
                            ? 'No se encontraron valores con esos filtros'
                            : 'Aún no hay valores. Escribe uno arriba y presiona Enter.'
                        }
                      />
                    ),
                  }}
                />
              </div>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default AttributesPage;
