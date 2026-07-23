import React, { useState, useEffect } from 'react';
import {
  Table, Button, Input, Select, DatePicker,
  notification, Popconfirm,
  Typography, Tag, Space, Row, Col, Checkbox, Popover, Tooltip
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, SettingOutlined
} from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';

import lotService from '../../../services/lotService';
import useTablePreferences from '../../../hooks/useTablePreferences';
import TableConfigDrawer from '../../../components/TableConfig/TableConfigDrawer';
import LotFormModal from './LotFormModal';
import AddQuantityModal from './AddQuantityModal';
import ReservationsModal from './ReservationsModal';

const { RangePicker } = DatePicker;
const { Option } = Select;
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

  const { visibleColumns, pinnedColumns, toggleVisible, togglePinned } =
    useTablePreferences('columns_lots', DEFAULT_VISIBLE_COLUMNS);
  const [configOpen, setConfigOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingLot, setEditingLot] = useState(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [addingLot, setAddingLot] = useState(null);

  // States for checkbox selection and reservations modal
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedLots, setSelectedLots] = useState([]);
  const [isReservationsModalVisible, setIsReservationsModalVisible] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const uid = decoded.id || decoded.user_id;
        setUserId(uid);
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
      setSelectedRowKeys(prev => prev.filter(key => data.some(l => String(l.lote_id) === String(key))));
      setSelectedLots(prev => prev.filter(lot => data.some(l => String(l.lote_id) === String(lot.lote_id))));
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
    setEditingLot(lot);
    setIsModalVisible(true);
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setEditingLot(null);
    setIsModalVisible(true);
  };

  const openAddModal = (lot) => {
    setAddingLot(lot);
    setIsAddModalVisible(true);
  };

  const handleVerReservas = async () => {
    const hasReservations = selectedLots.some(l => Number(l.cantidad_reservada) > 0);
    if (!hasReservations) {
      notification.warning({
        message: 'Sin reservas',
        description: 'Los lotes seleccionados no tienen reservas activas.',
        placement: 'topRight'
      });
      return;
    }

    setLoadingReservations(true);
    try {
      const response = await lotService.getReservations(selectedRowKeys);
      setReservations(response.data || response || []);
      setIsReservationsModalVisible(true);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'No se pudieron cargar las reservas activas.'
      });
    } finally {
      setLoadingReservations(false);
    }
  };

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
          <Text
            strong
            style={{
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              maxWidth: 300,
            }}
            title={fullName}
          >
            {fullName}
          </Text>
        );

      }
    },
    {
      title: 'Lote',
      dataIndex: 'numero_lote',
      key: 'numero_lote',
      width: 100,
      render: (text) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
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
        const suf = normalizeUnidad(record.unidad_medida);
        return (
          <Text strong style={{ fontSize: 15 }}>
            {val} {suf}
          </Text>
        );
      }
    },
    {
      title: 'Total',
      dataIndex: 'cantidad_inicial',
      key: 'cantidad_inicial',
      width: 110,
      render: (val, record) => {
        const suf = normalizeUnidad(record.unidad_medida);
        return <Text style={{ whiteSpace: 'nowrap' }}>{val} {suf}</Text>;
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
        ? new Date(val).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '-'
    },
    {
      title: 'Notas',
      dataIndex: 'notas',
      key: 'notas',
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{
            fontSize: 13,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            maxWidth: 180,
          }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
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
              <Button size="small" danger icon={<DeleteOutlined />} style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const columns = columnsDef
    .filter(c => visibleColumns.has(c.key))
    .map(c => ({
      ...c,
      fixed: pinnedColumns.has(c.key) ? 'left' : undefined,
    }));

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedLots(rows);
    },
  };

  const totalStockTallos = lots.reduce((sum, lot) => {
    const disponible = Number(lot.cantidad_disponible) || 0;
    const unidad = normalizeUnidad(lot.unidad_medida);
    if (unidad === 'ramos') {
      return sum + disponible * (Number(lot.tallos_por_ramo) || 0);
    }
    if (unidad === 'cajas') {
      return sum + disponible * (Number(lot.ramos_por_caja) || 0) * (Number(lot.tallos_por_ramo) || 0);
    }
    return sum + disponible;
  }, 0);

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Typography.Title level={3} style={{ margin: 0, color: '#2f2c2cff', fontWeight: 600 }}>
            Inventario
          </Typography.Title>
        </Col>
        <Col>
          <Space size="middle" align="center">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 6,
              background: '#f0f5f2',
              border: '1px solid #d9e5df',
            }}>
              <Text style={{ fontSize: 13, color: '#8c8c8c' }}>Stock disponible:</Text>
              <Text strong style={{ fontSize: 14, color: '#1a3c2e' }}>{totalStockTallos.toLocaleString('es-CO')} tallos</Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              style={{ backgroundColor: '#1a3c2e' }}
            >
              Nuevo Lote
            </Button>
            <Button
              onClick={handleVerReservas}
              disabled={selectedRowKeys.length === 0}
              style={selectedRowKeys.length > 0 ? {
                borderColor: '#1a3c2e',
                color: '#1a3c2e',
                backgroundColor: '#ffffff',
              } : {}}
            >
              Ver Reservas
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigOpen(true)}
            >
              Configurar Vista
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Buscar</Text>
          <Input
            placeholder="Buscar por producto o SKU..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Ubicación</Text>
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
        <Col xs={24} sm={12} md={6}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Estado</Text>
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
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Fecha</Text>
          <RangePicker
            style={{ width: '100%' }}
            onChange={handleDateChange}
            placeholder={['Fecha desde', 'Fecha hasta']}
          />
        </Col>
      </Row>

      <Table
        bordered
        rowSelection={rowSelection}
        columns={columns}
        dataSource={lots}
        rowKey="lote_id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{
          pageSizeOptions: ['25', '50', '100'],
          defaultPageSize: 25,
          showSizeChanger: true,
          showTotal: (total, range) => `Mostrando ${range[0]} - ${range[1]} de ${total} lotes`,
        }}
      />

      <LotFormModal
        open={isModalVisible}
        isEdit={isEdit}
        editingLot={editingLot}
        variants={variants}
        locations={locations}
        companySettings={companySettings}
        onClose={() => setIsModalVisible(false)}
        onSuccess={fetchLots}
      />

      <AddQuantityModal
        open={isAddModalVisible}
        lot={addingLot}
        onClose={() => setIsAddModalVisible(false)}
        onSuccess={fetchLots}
      />

      <ReservationsModal
        open={isReservationsModalVisible}
        reservations={reservations}
        loading={loadingReservations}
        onClose={() => setIsReservationsModalVisible(false)}
        onRemoved={(detailId) => setReservations(prev => prev.filter(r => String(r.detail_id) !== String(detailId)))}
        onSuccess={fetchLots}
      />

      <TableConfigDrawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        columns={ALL_COLUMNS.map(c => ({ key: c.key, label: c.title }))}
        visibleColumns={visibleColumns}
        pinnedColumns={pinnedColumns}
        onToggleVisible={toggleVisible}
        onTogglePinned={togglePinned}
      />
    </div>
  );
};

export default LotsPage;
