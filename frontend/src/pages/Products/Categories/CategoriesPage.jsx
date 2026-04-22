import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  notification,
  Typography,
  Skeleton,
  Tooltip,
  Tag,
  Row,
  Col,
  Divider,
  Dropdown,
  Checkbox,
  DatePicker,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ApartmentOutlined,
  SettingOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategory,
} from '../../../services/categoryService';
import useTablePreferences from '../../../hooks/useTablePreferences';
import TableConfigDrawer from '../../../components/TableConfig/TableConfigDrawer';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;
const { RangePicker } = DatePicker;

const ALL_COLUMN_KEYS = [
  { key: 'name', label: 'Nombre' },
  { key: 'reference', label: 'Referencia' },
  { key: 'parent', label: 'Categoría Padre' },
  { key: 'is_active', label: 'Estado' },
  { key: 'created_at', label: 'Fecha Creación' },
  { key: 'actions', label: 'Acciones' },
];
const DEFAULT_VISIBLE_KEYS = ['name', 'reference', 'parent', 'is_active', 'actions'];

const PRIMARY = '#1a3c2e';
const ACTIVE_COLOR = '#52b788';

// Construye el árbol de categorías padre→hijos para la tabla expandible de Ant Design
const buildTree = (categories) => {
  const map = {};
  categories.forEach((c) => { map[String(c.category_id)] = { ...c, children: [] }; });

  const roots = [];
  categories.forEach((c) => {
    if (c.parent_id) {
      const parentKey = String(c.parent_id);
      if (map[parentKey]) map[parentKey].children.push(map[String(c.category_id)]);
      else roots.push(map[String(c.category_id)]);
    } else {
      roots.push(map[String(c.category_id)]);
    }
  });

  // Eliminar arrays children vacíos para que Ant Design no muestre la flecha de expansión
  const clean = (nodes) =>
    nodes.map((n) => ({
      ...n,
      children: n.children.length ? clean(n.children) : undefined,
    }));

  return clean(roots);
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [inputSearch, setInputSearch] = useState('');
  const [inputStatus, setInputStatus] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({ name: '', reference: '', is_active: '' });

  const { visibleColumns, pinnedColumns, toggleVisible, togglePinned } = 
    useTablePreferences('columns_categories', DEFAULT_VISIBLE_KEYS);
  const [configOpen, setConfigOpen] = useState(false);

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [parentOptions, setParentOptions] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);

  const fetchCategories = useCallback(async (filters) => {
    setLoading(true);
    try {
      const data = await getCategories(filters);
      const list = Array.isArray(data)
        ? data
        : (data.data ?? data.categories ?? []);
      const count = Array.isArray(data)
        ? data.length
        : (data.total ?? data.count ?? list.length);

      setCategories(list);
      setTreeData(buildTree(list));
      setTotalCount(count);
      setSelectedRowKeys([]);
    } catch (err) {
      notification.error({
        message: 'Error al cargar categorías',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParentOptions = useCallback(async (excludeId = null) => {
    setLoadingParents(true);
    try {
      const data = await getCategories({ is_active: 'true' });
      let list = Array.isArray(data) ? data : (data.data ?? data.categories ?? []);
      if (excludeId !== null)
        list = list.filter((c) => String(c.category_id) !== String(excludeId));
      setParentOptions(list);
    } catch {
      setParentOptions([]);
    } finally {
      setLoadingParents(false);
    }
  }, []);

  const handleSearch = () => {
    const filters = {
      name: inputSearch.trim(),
      reference: inputSearch.trim(),
      is_active: inputStatus,
    };
    setAppliedFilters(filters);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchCategories(filters);
  };

  const handleClear = () => {
    setInputSearch('');
    setInputStatus('');
    const filters = { name: '', reference: '', is_active: '' };
    setAppliedFilters(filters);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchCategories(filters);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    form.resetFields();
    fetchParentOptions(null);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setModalMode('edit');
    setSelectedItem(record);
    form.setFieldsValue({
      name: record.name,
      reference: record.reference,
      parent_id: record.parent_id ? String(record.parent_id) : undefined,
    });
    fetchParentOptions(record.category_id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
    setSelectedItem(null);
    setParentOptions([]);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); }
    catch { return; }

    const payload = { ...values, parent_id: values.parent_id || null };
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await createCategory(payload);
        notification.success({ message: 'Categoría creada correctamente' });
      } else {
        await updateCategory(selectedItem.category_id, payload);
        notification.success({ message: 'Categoría actualizada correctamente' });
      }
      closeModal();
      fetchCategories(appliedFilters);
    } catch (err) {
      notification.error({
        message: modalMode === 'create' ? 'Error al crear' : 'Error al actualizar',
        description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (record) => {
    const action = record.is_active ? 'inactivar' : 'activar';
    confirm({
      title: `¿Deseas ${action} la categoría "${record.name}"?`,
      icon: <ExclamationCircleOutlined />,
      okText: action.charAt(0).toUpperCase() + action.slice(1),
      okType: record.is_active ? 'danger' : 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await toggleCategory(record.category_id);
          notification.success({
            message: `Categoría ${record.is_active ? 'inactivada' : 'activada'} correctamente`,
          });
          fetchCategories(appliedFilters);
        } catch (err) {
          notification.error({
            message: 'Error al cambiar estado',
            description: err?.response?.data?.mensaje || err?.response?.data?.message || err.message,
          });
        }
      },
    });
  };

  const handleDelete = (record) => {
    confirm({
      title: `¿Eliminar la categoría "${record.name}"?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: <Text type="danger" style={{ fontSize: 13 }}>Esta acción no se puede deshacer.</Text>,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteCategory(record.category_id);
          notification.success({ message: 'Categoría eliminada correctamente' });
          fetchCategories(appliedFilters);
        } catch (err) {
          notification.error({
            message: 'Error al eliminar',
            description: err?.response?.data?.mensaje || err?.response?.data?.message || 'No se pudo eliminar',
          });
        }
      },
    });
  };

  const executeBulk = async (action) => {
    setBulkLoading(true);
    const errors = [];

    // Filtrar solo las categorías que realmente necesitan cambiar de estado
    let targetIds = [...selectedRowKeys];
    if (action === 'activate') {
      const inactiveIds = new Set(
        categories.filter((c) => !c.is_active).map((c) => String(c.category_id))
      );
      targetIds = selectedRowKeys.filter((key) => inactiveIds.has(String(key)));
    } else if (action === 'deactivate') {
      const activeIds = new Set(
        categories.filter((c) => c.is_active).map((c) => String(c.category_id))
      );
      targetIds = selectedRowKeys.filter((key) => activeIds.has(String(key)));
    }

    if (targetIds.length === 0) {
      setBulkLoading(false);
      notification.info({
        message: 'Sin cambios necesarios',
        description:
          action === 'activate'
            ? 'Todas las categorías seleccionadas ya están activas.'
            : 'Todas las categorías seleccionadas ya están inactivas.',
      });
      return;
    }

    await Promise.allSettled(
      targetIds.map(async (key) => {
        try {
          if (action === 'activate' || action === 'deactivate') await toggleCategory(key);
          if (action === 'delete') await deleteCategory(key);
        } catch (err) {
          errors.push(err);
        }
      })
    );
    setBulkLoading(false);
    if (errors.length === 0) {
      const msg = action === 'delete' ? 'eliminadas' : action === 'activate' ? 'activadas' : 'inactivadas';
      notification.success({ message: `${targetIds.length} categoría(s) ${msg} correctamente` });
    } else {
      notification.warning({
        message: 'Algunas acciones fallaron',
        description: `${errors.length} operación(es) no pudieron completarse.`,
      });
    }
    fetchCategories(appliedFilters);
  };

  const getAffectedCount = (action) => {
    if (action === 'delete') return selectedRowKeys.length;
    if (action === 'activate')
      return categories.filter((c) => !c.is_active && selectedRowKeys.includes(String(c.category_id))).length;
    if (action === 'deactivate')
      return categories.filter((c) => c.is_active && selectedRowKeys.includes(String(c.category_id))).length;
    return selectedRowKeys.length;
  };

  const confirmBulk = (action) => {
    const affected = getAffectedCount(action);
    const labels = {
      activate: { title: '¿Activar las categorías seleccionadas?', okType: 'primary', okText: 'Activar' },
      deactivate: { title: '¿Inactivar las categorías seleccionadas?', okType: 'danger', okText: 'Inactivar' },
      delete: { title: '¿Eliminar las categorías seleccionadas?', okType: 'danger', okText: 'Eliminar' },
    };
    const skipped = selectedRowKeys.length - affected;
    confirm({
      title: labels[action].title,
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          Se aplicará la acción a <strong>{affected}</strong> categoría(s).
          {skipped > 0 && (
            <span style={{ color: '#888', display: 'block', fontSize: 12, marginTop: 4 }}>
              {skipped} ya {action === 'activate' ? 'activa(s)' : 'inactiva(s)'} — serán omitidas.
            </span>
          )}
        </span>
      ),
      okText: labels[action].okText,
      okType: labels[action].okType,
      cancelText: 'Cancelar',
      onOk: () => executeBulk(action),
    });
  };

  const allColumns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Referencia',
      dataIndex: 'reference',
      key: 'reference',
      sorter: (a, b) => (a.reference ?? '').localeCompare(b.reference ?? ''),
      render: (text) => <Text code style={{ fontSize: 12 }}>{text ?? '—'}</Text>,
    },
    {
      title: 'Categoría Padre',
      dataIndex: 'parent',
      key: 'parent',
      render: (parent) =>
        parent?.name ? (
          <Tag icon={<ApartmentOutlined />} color="geekblue" style={{ fontWeight: 500 }}>
            {parent.name}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 110,
      align: 'center',
      render: (active) =>
        active ? (
          <Tag color="success">Activo</Tag>
        ) : (
          <Tag color="error">Inactivo</Tag>
        ),
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) =>
        date
          ? new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? 'Inactivar' : 'Activar'}>
            <Button
              size="small"
              icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggle(record)}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const columns = allColumns
    .filter((c) => visibleColumns.has(c.key))
    .map((c) => ({
      ...c,
      fixed: pinnedColumns.has(c.key) ? 'left' : undefined,
    }));

  const skeletonRows = Array.from({ length: 6 }, (_, i) => ({
    key: `sk-${i}`,
    name: <Skeleton.Input active size="small" style={{ width: 140 }} />,
    reference: <Skeleton.Input active size="small" style={{ width: 80 }} />,
    parent: <Skeleton.Input active size="small" style={{ width: 110 }} />,
    is_active: <Skeleton.Button active size="small" style={{ width: 60 }} />,
    created_at: <Skeleton.Input active size="small" style={{ width: 100 }} />,
    actions: <Skeleton.Button active size="small" />,
  }));

  const pagedData = treeData.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    checkStrictly: false,
    columnWidth: 40,
  };

  const showDateFilter = visibleColumns.has('created_at');

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Categorías de Productos
          </Title>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setConfigOpen(true)}
              style={{ borderRadius: 8, height: 38 }}
            >
              Configurar tabla
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              style={{ background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8, height: 38 }}
            >
              Nueva Categoría
            </Button>
          </Space>
        </Col>
      </Row>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Buscar por nombre o referencia"
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Estado"
              value={inputStatus || undefined}
              onChange={(val) => setInputStatus(val ?? '')}
              allowClear
              style={{ width: '100%', borderRadius: 8 }}
            >
              <Option value="">Todos</Option>
              <Option value="true">Activos</Option>
              <Option value="false">Inactivos</Option>
            </Select>
          </Col>
          {showDateFilter && (
            <Col xs={24} sm={14} md={10}>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                placeholder={['Fecha desde', 'Fecha hasta']}
                style={{ borderRadius: 8, width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>
          )}
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
              >
                Buscar
              </Button>
              <Button icon={<ClearOutlined />} onClick={handleClear} style={{ borderRadius: 8 }}>
                Limpiar
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {selectedRowKeys.length > 0 && (
        <div
          style={{
            background: '#f0f7f4',
            border: '1.5px solid #52b788',
            borderRadius: 10,
            padding: '10px 20px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Badge
            count={selectedRowKeys.length}
            style={{ backgroundColor: PRIMARY }}
          />
          <Text strong style={{ color: PRIMARY }}>
            {selectedRowKeys.length} {selectedRowKeys.length === 1 ? 'categoría seleccionada' : 'categorías seleccionadas'}
          </Text>
          <Divider type="vertical" style={{ borderColor: ACTIVE_COLOR }} />
          <Space wrap>
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={bulkLoading}
              onClick={() => confirmBulk('activate')}
              style={{ borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR, fontWeight: 600, borderRadius: 6 }}
            >
              Activar
            </Button>
            <Button
              size="small"
              icon={<StopOutlined />}
              loading={bulkLoading}
              onClick={() => confirmBulk('deactivate')}
              style={{ borderColor: '#faad14', color: '#faad14', fontWeight: 600, borderRadius: 6 }}
            >
              Inactivar
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={bulkLoading}
              onClick={() => confirmBulk('delete')}
              style={{ fontWeight: 600, borderRadius: 6 }}
            >
              Eliminar
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setSelectedRowKeys([])}
              style={{ borderRadius: 6 }}
            >
              Limpiar selección
            </Button>
          </Space>
        </div>
      )}

      {!loading && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
          Mostrando <strong>{Math.min(pagination.pageSize, pagedData.length)}</strong> de{' '}
          <strong>{totalCount}</strong>{' '}
          {totalCount === 1 ? 'categoría' : 'categorías'}
        </Text>
      )}

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}
      >
        <Table
          rowKey="category_id"
          columns={columns}
          dataSource={loading ? skeletonRows : pagedData}
          loading={false}
          rowSelection={loading ? undefined : rowSelection}
          expandable={{
            indentSize: 24,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: treeData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            style: { padding: '12px 16px' },
          }}
          size="middle"
          style={{ borderRadius: 12 }}
        />
      </div>

      <Modal
        title={
          <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 16 }}>
            {modalMode === 'create' ? '✦ Nueva Categoría' : '✎ Editar Categoría'}
          </span>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        okText={modalMode === 'create' ? 'Crear' : 'Guardar'}
        cancelText="Cancelar"
        confirmLoading={saving}
        okButtonProps={{
          style: { background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8 },
        }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={480}
        destroyOnClose
        bodyStyle={{ paddingTop: 8 }}
      >
        <Divider style={{ margin: '8px 0 20px' }} />
        <Form form={form} layout="vertical">

          <Form.Item
            label={
              <Space size={4}>
                <ApartmentOutlined style={{ color: PRIMARY }} />
                <Text strong>Categoría Padre</Text>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(opcional)</Text>
              </Space>
            }
            name="parent_id"
          >
            <Select
              placeholder="Sin categoría padre"
              allowClear
              loading={loadingParents}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%', borderRadius: 8 }}
              notFoundContent={
                <Text type="secondary" style={{ fontSize: 13 }}>No hay categorías activas disponibles</Text>
              }
            >
              {parentOptions.map((cat) => (
                <Option key={String(cat.category_id)} value={String(cat.category_id)}>
                  {cat.name} ({cat.reference})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={<Text strong>Nombre</Text>}
            name="name"
            rules={[
              { required: true, message: 'El nombre es requerido' },
              { min: 2, message: 'Mínimo 2 caracteres' },
              { max: 100, message: 'Máximo 100 caracteres' },
            ]}
          >
            <Input placeholder="Ej. Rosas, Follajes, Lirios…" style={{ borderRadius: 8 }} autoFocus />
          </Form.Item>

          <Form.Item
            label={<Text strong>Referencia</Text>}
            name="reference"
            rules={[
              { required: true, message: 'La referencia es requerida' },
              { min: 1, message: 'Mínimo 1 caracter' },
              { max: 50, message: 'Máximo 50 caracteres' },
            ]}
          >
            <Input
              placeholder="Ej. ROS-001, FOLL, LIR"
              style={{ borderRadius: 8, textTransform: 'uppercase' }}
            />
          </Form.Item>

        </Form>
      </Modal>

      <TableConfigDrawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        columns={ALL_COLUMN_KEYS}
        visibleColumns={visibleColumns}
        pinnedColumns={pinnedColumns}
        onToggleVisible={toggleVisible}
        onTogglePinned={togglePinned}
      />
    </div>
  );
};

export default CategoriesPage;
