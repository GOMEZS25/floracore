import React, { useState, useEffect } from 'react';
import {
  Table, Button, Input, Select, DatePicker,
  notification, Popconfirm, Typography, Tag, Space, Row, Col, Card, Tooltip
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EyeOutlined,
  CheckCircleOutlined, CarOutlined, CloseCircleOutlined, SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ReloadOutlined } from '@ant-design/icons';

import salesService from '../../../services/salesService';
import useTablePreferences from '../../../hooks/useTablePreferences';
import TableConfigDrawer from '../../../components/TableConfig/TableConfigDrawer';
import { formatOrderNumber } from '../../../utils/orderNumber';
import { formatMoney } from './orderFormHelpers';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const STATUS_TAG_COLOR = {
  BORRADOR: 'default',
  CONFIRMADA: 'processing',
  DESPACHADA: 'success',
  CANCELADA: 'error',
};

const DEFAULT_VISIBLE_COLUMNS = [
  'order_number', 'client', 'delivery_date', 'status', 'total', 'created_at', 'actions'
];

const ALL_COLUMNS = [
  { key: 'order_number', title: 'Nº Orden' },
  { key: 'client', title: 'Cliente' },
  { key: 'delivery_date', title: 'Fecha Entrega' },
  { key: 'status', title: 'Estado' },
  { key: 'total', title: 'Total' },
  { key: 'created_at', title: 'Creado' },
  { key: 'client_address', title: 'Dirección entrega' },
  { key: 'notes', title: 'Notas' },
  { key: 'transaction_category', title: 'Categoría' },
  { key: 'actions', title: 'Acciones' }
];

const SalesOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    status: undefined,
    fecha_desde: dayjs().format('YYYY-MM-DD'),
    fecha_hasta: dayjs().add(2, 'day').format('YYYY-MM-DD'),
  });

  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

  const { visibleColumns, pinnedColumns, toggleVisible, togglePinned } =
    useTablePreferences('columns_sales_orders', DEFAULT_VISIBLE_COLUMNS);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.current, pagination.pageSize]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.fecha_desde) params.delivery_date_start = filters.fecha_desde;
      if (filters.fecha_hasta) params.delivery_date_end = filters.fecha_hasta;

      const response = await salesService.listarOrdenes(params);
      const data = response?.data?.data || response?.data || response || [];
      const total = response?.total ?? data.length;
      // Sum of every order matching the current filters, not just this page.
      const grand = Number(response?.totals?.grandTotal) || 0;

      setOrders(data);
      setTotalRecords(total);
      setGrandTotal(grand);
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudieron cargar las órdenes.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    if (e.key === 'Enter') {
      setFilters(prev => ({ ...prev, search: e.target.value }));
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  };

  const executeSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        fecha_desde: dates[0].format('YYYY-MM-DD'),
        fecha_hasta: dates[1].format('YYYY-MM-DD')
      }));
    } else {
      setFilters(prev => ({ ...prev, fecha_desde: null, fecha_hasta: null }));
    }
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleApprove = async (id) => {
    try {
      await salesService.cambiarEstadoOrden(id, 'CONFIRMADA');
      notification.success({ message: 'Orden confirmada con éxito' });
      fetchOrders();
    } catch (error) {
      notification.error({
        message: 'Error al confirmar',
        description: error.response?.data?.mensaje || 'No se pudo confirmar la orden.'
      });
    }
  };

  const handleDispatch = async (id) => {
    try {
      await salesService.cambiarEstadoOrden(id, 'DESPACHADA');
      notification.success({ message: 'Orden despachada con éxito' });
      fetchOrders();
    } catch (error) {
      notification.error({
        message: 'Error al despachar',
        description: error.response?.data?.mensaje || 'No se pudo despachar la orden.'
      });
    }
  };

  const handleCancel = async (id) => {
    try {
      await salesService.cambiarEstadoOrden(id, 'CANCELADA');
      notification.success({ message: 'Orden cancelada' });
      fetchOrders();
    } catch (error) {
      notification.error({
        message: 'Error al cancelar',
        description: error.response?.data?.mensaje || 'No se pudo cancelar la orden.'
      });
    }
  };

  const calculateTotal = (record) => {
    if (!record.details || !Array.isArray(record.details)) return 0;
    return record.details.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  };

  const columnsDef = [
    {
      title: 'Nº Orden',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text) => <Text strong>{text ? formatOrderNumber(text) : '-'}</Text>,
    },
    {
      title: 'Cliente',
      key: 'client',
      render: (_, record) => <Text>{record.client?.name || '-'}</Text>,
    },
    {
      title: 'Fecha Entrega',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: (val) => val ? dayjs(val.slice(0, 10)).toDate().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        status === 'BORRADOR' ? (
          <Tag
            style={{
              fontWeight: 'bold',
              backgroundColor: 'var(--fc-badge-draft-bg)',
              color: 'var(--fc-badge-draft-text)',
              borderColor: 'var(--fc-badge-draft-bg)',
            }}
          >
            {status}
          </Tag>
        ) : (
          <Tag color={STATUS_TAG_COLOR[status] || 'default'} style={{ fontWeight: 'bold' }}>
            {status}
          </Tag>
        )
      )
    },
    {
      title: 'Total',
      key: 'total',
      render: (_, record) => {
        const total = calculateTotal(record);
        const currency = record.client?.currency || 'COP';
        return <Text strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(total)}</Text>;
      }
    },
    {
      title: 'Creado',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => val ? new Date(val).toLocaleDateString('es-CO') : '-'
    },
    {
      title: 'Dirección entrega',
      key: 'client_address',
      render: (_, record) => record.client_address?.address_line || '-'
    },
    {
      title: 'Notas',
      dataIndex: 'notes',
      key: 'notes',
    },
    {
      title: 'Categoría',
      key: 'transaction_category',
      render: (_, record) => record.transaction_category?.name || '-'
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Ver Detalle">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/sales/orders/${record.order_id}`)}
              style={{ borderColor: '#d9d9d9', color: 'var(--fc-accent)' }}
            />
          </Tooltip>

          {record.status === 'BORRADOR' && (
            <Tooltip title="Confirmar orden">
              <Popconfirm
                title="¿Confirmar orden?"
                onConfirm={() => handleApprove(record.order_id)}
                okText="Sí"
                cancelText="No"
              >
                <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff' }} />
              </Popconfirm>
            </Tooltip>
          )}

          {record.status === 'CONFIRMADA' && (
            <Tooltip title="Despachar Orden">
              <Popconfirm
                title="¿Despachar esta orden? Se moverá el inventario permanentemente."
                onConfirm={() => handleDispatch(record.order_id)}
                okText="Sí"
                cancelText="No"
              >
                <Button size="small" icon={<CarOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} />
              </Popconfirm>
            </Tooltip>
          )}

          {(record.status === 'BORRADOR' || record.status === 'CONFIRMADA') && (
            <Tooltip title="Cancelar Orden">
              <Popconfirm
                title="¿Cancelar esta orden? Esta acción no se puede deshacer."
                onConfirm={() => handleCancel(record.order_id)}
                okText="Sí"
                cancelText="No"
              >
                <Button size="small" danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
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

  // Walk the same visible columns the Table receives, so the value stays under the
  // Total column whatever the user hides or reorders in "Configurar Vista".
  const renderSummary = () => (
    <Table.Summary>
      <Table.Summary.Row>
        {columns.map((col, index) => (
          <Table.Summary.Cell key={col.key} index={index}>
            {col.key === 'total'
              ? <Text strong>{formatMoney(grandTotal)}</Text>
              : (index === 0 ? <Text>Total general</Text> : null)}
          </Table.Summary.Cell>
        ))}
      </Table.Summary.Row>
    </Table.Summary>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
            Órdenes de Venta
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/sales/orders/new')}
            style={{ backgroundColor: 'var(--fc-accent)' }}
          >
            Nueva Orden
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Buscar</Text>
            <Input.Search
              placeholder="Nº Orden o Cliente..."
              allowClear
              onSearch={executeSearch}
              onKeyDown={handleSearchChange}
              enterButton={<Button icon={<SearchOutlined />} />}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Estado</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Estado"
              allowClear
              value={filters.status}
              onChange={(val) => handleFilterChange('status', val)}
            >
              <Option value="BORRADOR">BORRADOR</Option>
              <Option value="CONFIRMADA">CONFIRMADA</Option>
              <Option value="DESPACHADA">DESPACHADA</Option>
              <Option value="CANCELADA">CANCELADA</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={7}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Fecha de Entrega</Text>
            <RangePicker
              style={{ width: '100%' }}
              value={[
                filters.fecha_desde ? dayjs(filters.fecha_desde) : null,
                filters.fecha_hasta ? dayjs(filters.fecha_hasta) : null,
              ]}
              onChange={handleDateChange}
              placeholder={['Fecha desde', 'Fecha hasta']}
            />
          </Col>
          <Col xs={4} sm={4} md={2}>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4, visibility: 'hidden' }}>.</Text>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchOrders}
              style={{ height: 38, width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 12, display: 'block', marginBottom: 4, visibility: 'hidden' }}>.</Text>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigOpen(true)}
              style={{ borderRadius: 8, height: 38, width: '100%' }}
            >
              Configurar Vista
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey={(record) => record.order_id}
        loading={loading}
        scroll={{ x: 1000 }}
        summary={renderSummary}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: totalRecords,
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100'],
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          showTotal: (total, range) => `Mostrando ${range[0]} - ${range[1]} de ${total} órdenes`,
        }}
      />

      <TableConfigDrawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        pinnedColumns={pinnedColumns}
        onToggleVisible={toggleVisible}
        onTogglePinned={togglePinned}
      />
    </div>
  );
};

export default SalesOrdersPage;
