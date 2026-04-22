import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  Popconfirm,
  message,
  Dropdown,
  Checkbox,
  Typography,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  SettingOutlined,
  DownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getLocations,
  createLocation,
  updateLocation,
  toggleLocation
} from '../../../services/locationService';
import useTablePreferences from '../../../hooks/useTablePreferences';
import TableConfigDrawer from '../../../components/TableConfig/TableConfigDrawer';

const { Title } = Typography;
const { Option } = Select;

const LocationsPage = () => {
  const [locations, setLocations] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ name: '', type: '', is_active: '' });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [form] = Form.useForm();

  // Table configuration
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const DEFAULT_VISIBLE_KEYS = ['name', 'type', 'description', 'status', 'actions'];
  const { visibleColumns, pinnedColumns, toggleVisible, togglePinned } =
    useTablePreferences('columns_locations', DEFAULT_VISIBLE_KEYS);
  const [configOpen, setConfigOpen] = useState(false);

  // Modal dynamic logic
  const [selectedType, setSelectedType] = useState(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await getLocations(filters);
      // Asumiendo que el backend retorna data.data o map directo si es arreglo
      const data = response.data || response;
      setLocations(data);
      setTreeData(buildTree(data));
    } catch (error) {
      message.error('Error al cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildTree = (data) => {
    const map = {};
    const roots = [];

    // Initialize map
    data.forEach(item => {
      map[item.location_id] = { ...item, key: item.location_id.toString(), children: [] };
    });

    data.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.location_id]);
      } else {
        roots.push(map[item.location_id]);
      }
    });

    // Remove empty children arrays
    const cleanEmptyChildren = (nodes) => {
      nodes.forEach(node => {
        if (node.children.length === 0) {
          delete node.children;
        } else {
          cleanEmptyChildren(node.children);
        }
      });
    };
    cleanEmptyChildren(roots);

    return roots;
  };

  const handleSearch = () => {
    fetchLocations();
  };

  const handleToggle = async (id) => {
    try {
      await toggleLocation(id);
      message.success('Estado actualizado correctamente');
      fetchLocations();
    } catch (error) {
      message.error('Error al actualizar el estado');
    }
  };

  const handleMassToggle = async (activate) => {
    try {
      // Nota: Si no existe un endpoint de toggle masivo, iteramos. Adaptar si tu backend lo soporta con un array de IDs.
      setLoading(true);
      await Promise.all(
        selectedRowKeys.map(id => {
          // Si requerimos saber si es activar o desactivar, y solo tenemos toggle, podríamos tener que verificar el estado actual.
          // Para este mock, usamos toggle simple per row
          return toggleLocation(id);
        })
      );
      message.success(`Ubicaciones procesadas correctamente`);
      setSelectedRowKeys([]);
      fetchLocations();
    } catch (error) {
      message.error('Error en operación masiva');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (record = null) => {
    setEditingLocation(record);
    if (record) {
      setSelectedType(record.type);
      form.setFieldsValue({
        name: record.name,
        type: record.type,
        description: record.description,
        parent_id: record.parent_id ? record.parent_id.toString() : null
      });
    } else {
      setSelectedType(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingLocation(null);
    setSelectedType(null);
  };

  const handleModalSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        parent_id: values.parent_id ? parseInt(values.parent_id, 10) : null
      };

      if (editingLocation) {
        await updateLocation(editingLocation.location_id, payload);
        message.success('Ubicación actualizada');
      } else {
        await createLocation(payload);
        message.success('Ubicación creada exitosamente');
      }
      closeModal();
      fetchLocations();
    } catch (error) {
      message.error(error.response?.data?.mensaje || 'Error al guardar la ubicación');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'FINCA': return 'blue';
      case 'BLOQUE': return 'orange';
      case 'CAMA': return 'green';
      default: return 'default';
    }
  };

  // Dinámicamente calcular las opciones del Padre
  const parentOptions = useMemo(() => {
    if (!selectedType || selectedType === 'FINCA') return [];

    // Si es BLOQUE, el padre debe ser FINCA activa
    if (selectedType === 'BLOQUE') {
      return locations.filter(loc => loc.type === 'FINCA' && loc.is_active);
    }
    // Si es CAMA, el padre debe ser BLOQUE activo
    if (selectedType === 'CAMA') {
      return locations.filter(loc => loc.type === 'BLOQUE' && loc.is_active);
    }
    return [];
  }, [selectedType, locations]);

  const onTypeChange = (value) => {
    setSelectedType(value);
    form.setFieldsValue({ parent_id: undefined }); // Limpiar padre al cambiar tipo
  };

  // Definición de las columnas (configurables)
  const columnsDef = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag color={getTypeColor(type)}>{type}</Tag>,
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Estado',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? 'Inactivar' : 'Activar'}>
            <Popconfirm
              title={`¿Seguro de ${record.is_active ? 'inactivar' : 'activar'} esta ubicación?`}
              onConfirm={() => handleToggle(record.location_id)}
              okText="Sí"
              cancelText="No"
            >
              <Button
                size="small"
                icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Space>
      ),
    }
  ];

  // Columnas a mostrar basadas en visibilidad
  const activeColumns = columnsDef
    .filter(col => visibleColumns.has(col.key))
    .map(col => ({
      ...col,
      fixed: pinnedColumns.has(col.key) ? 'left' : undefined,
    }));

  const ALL_COLUMN_KEYS = [
    { key: 'name', label: 'Nombre' },
    { key: 'type', label: 'Tipo' },
    { key: 'description', label: 'Descripción' },
    { key: 'status', label: 'Estado' },
    { key: 'createdAt', label: 'Fecha Creación' },
    { key: 'actions', label: 'Acciones' },
  ];



return (
  <div style={{ padding: '24px' }}>
    <Card style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ color: '#595959', fontWeight: 600, margin: 0 }}>Ubicaciones</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          style={{ backgroundColor: '#1a3c2e', border: 'none', borderRadius: '6px' }}
        >
          Nueva Ubicación
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Buscar por nombre..."
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          onPressEnter={handleSearch}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder="Filtrar por tipo"
          value={filters.type || undefined}
          onChange={(val) => setFilters({ ...filters, type: val || '' })}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="FINCA">Finca</Option>
          <Option value="BLOQUE">Bloque</Option>
          <Option value="CAMA">Cama</Option>
        </Select>
        <Select
          placeholder="Estado"
          value={filters.is_active === '' ? 'todos' : filters.is_active}
          onChange={(val) => setFilters({ ...filters, is_active: val === 'todos' ? '' : val })}
          style={{ width: 120 }}
        >
          <Option value="todos">Todos</Option>
          <Option value={true}>Activo</Option>
          <Option value={false}>Inactivo</Option>
        </Select>
        <Button type="primary" style={{ backgroundColor: '#52b788', border: 'none' }} icon={<SearchOutlined />} onClick={handleSearch}>
          Buscar
        </Button>

        <Button
          icon={<SettingOutlined />}
          onClick={() => setConfigOpen(true)}
          style={{ borderRadius: 8, height: 38 }}
        >
          Configurar tabla
        </Button>
      </Space>

      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
          <span style={{ marginRight: 16 }}>{selectedRowKeys.length} items seleccionados</span>
          <Button size="small" onClick={() => handleMassToggle(true)} style={{ marginRight: 8, color: '#52b788', borderColor: '#52b788' }}>
            Procesar (Toggle)
          </Button>
          <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>
            Desmarcar todos
          </Button>
        </div>
      )}

      <Table
        columns={activeColumns}
        dataSource={treeData}
        loading={loading}
        rowKey="key"
        rowSelection={{
          selectedRowKeys,
          onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
        }}
        pagination={{
          defaultPageSize: 25,
          pageSizeOptions: ['25', '50', '100'],
          showSizeChanger: true,
          showTotal: () => `Mostrando ${treeData.length} de ${locations.length} ubicaciones`
        }}
        expandable={{
          // Opcional: icon customizado si lo requieren
        }}
      />
    </Card>

    <Modal
      title={editingLocation ? "Editar Ubicación" : "Nueva Ubicación"}
      open={isModalVisible}
      onCancel={closeModal}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleModalSubmit}
      >
        <Form.Item
          name="type"
          label="Tipo"
          rules={[{ required: true, message: 'Por favor seleccione el tipo' }]}
        >
          <Select
            placeholder="Seleccione el tipo de ubicación"
            onChange={onTypeChange}
            disabled={!!editingLocation} // Usualmente no se permite cambiar de finca a cama a la ligera
          >
            <Option value="FINCA">Finca</Option>
            <Option value="BLOQUE">Bloque</Option>
            <Option value="CAMA">Cama</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="name"
          label="Nombre"
          rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
        >
          <Input placeholder="Ej. Bloque 1, Cama A..." />
        </Form.Item>

        {selectedType && selectedType !== 'FINCA' && (
          <Form.Item
            name="parent_id"
            label={selectedType === 'BLOQUE' ? 'Finca Padre' : 'Bloque Padre'}
            rules={[{
              required: true,
              message: selectedType === 'BLOQUE' ? 'Selecciona una Finca padre' : 'Selecciona un Bloque padre'
            }]}
          >
            <Select
              placeholder={`Seleccione el padre (${selectedType === 'BLOQUE' ? 'Finca' : 'Bloque'})`}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {parentOptions.map(loc => (
                <Option key={loc.location_id.toString()} value={loc.location_id.toString()}>
                  {loc.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="description"
          label="Descripción"
        >
          <Input.TextArea rows={3} placeholder="Ingrese descripción detallada (Opcional)" />
        </Form.Item>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          <Button onClick={closeModal} style={{ marginRight: 8 }}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1a3c2e' }} loading={loading}>
            Guardar
          </Button>
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

export default LocationsPage;
