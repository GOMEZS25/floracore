import React, { useState, useEffect } from 'react';
import {
  Table, Button, Input, Select, Drawer,
  Modal, Form, notification, Popconfirm,
  Typography, Tag, Space, Row, Col, Card, Tooltip, Divider, List, Spin
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, SettingOutlined, EyeOutlined
} from '@ant-design/icons';

import clientService from '../../../services/clientService';
import useTablePreferences from '../../../hooks/useTablePreferences';
import TableConfigDrawer from '../../../components/TableConfig/TableConfigDrawer';

const { Option } = Select;
const { Text, Title } = Typography;

const STATUS_TAG_COLOR = {
  ACTIVO: 'success',
  INACTIVO: 'error',
};

const DEFAULT_VISIBLE_COLUMNS = [
  'code', 'name', 'origin', 'currency', 'delivery_terms', 'address', 'status', 'actions'
];

const ALL_COLUMNS = [
  { key: 'code', title: 'Código' },
  { key: 'name', title: 'Nombre' },
  { key: 'origin', title: 'Tipo de cliente' },
  { key: 'currency', title: 'Moneda' },
  { key: 'delivery_terms', title: 'Términos de entrega' },
  { key: 'address', title: 'Dirección' },
  { key: 'full_name', title: 'Contacto' },
  { key: 'email', title: 'Email' },
  { key: 'phone', title: 'Teléfono' },
  { key: 'role', title: 'Cargo' },
  { key: 'status', title: 'Estado' },
  { key: 'created_at', title: 'Fecha creación' },
  { key: 'actions', title: 'Acciones' }
];

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtro "status" con valor por defecto "ACTIVO"
  const [filters, setFilters] = useState({ search: '', status: 'ACTIVO' });

  const { visibleColumns, pinnedColumns, toggleVisible, togglePinned } =
    useTablePreferences('columns_clients', DEFAULT_VISIBLE_COLUMNS);
  const [configOpen, setConfigOpen] = useState(false);

  // States for Create/Edit Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // States for Detail Drawer
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // States for Extra Details Modals (inside Drawer)
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [addressForm] = Form.useForm();
  const [contactForm] = Form.useForm();

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = {};

      if (filters.status === 'ACTIVO') {
        params.is_active = 'true';
      } else if (filters.status === 'INACTIVO') {
        params.is_active = 'false';
      }

      const response = await clientService.getClients(params);
      let data = response?.data?.data || response?.data || response || [];
      setClients(data);
    } catch {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los clientes.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = async (clientId) => {
    try {
      await clientService.deleteClient(clientId);
      notification.success({ message: 'Cliente desactivado exitosamente' });
      fetchClients();
      if (selectedClient && selectedClient.client_id === clientId) {
        setDetailVisible(false);
      }
    } catch (error) {
      notification.error({
        message: 'Error al desactivar',
        description: error.response?.data?.mensaje || 'No se puede desactivar el cliente.'
      });
    }
  };

  const handleEdit = (client) => {
    setIsEdit(true);
    setEditingClientId(client.client_id);
    form.setFieldsValue({
      code: client.code,
      name: client.name,
      origin: client.origin,
      currency: client.currency,
      delivery_terms: client.delivery_terms,
      status: client.status
    });
    setIsModalVisible(true);
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setEditingClientId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVO' });
    setIsModalVisible(true);
  };

  const onModalOk = () => {
    form.validateFields().then(async (values) => {
      setSaving(true);
      try {
        if (isEdit) {
          // Actualización normal
          await clientService.updateClient(editingClientId, values);
          notification.success({ message: 'Cliente actualizado correctamente' });
          setIsModalVisible(false);
          fetchClients();
          if (selectedClient && selectedClient.client_id === editingClientId) {
            refreshSelectedClient(editingClientId);
          }
        } else {
          // Creación secuencial
          // 1. Crear Cliente
          const clientPayload = {
            code: values.code,
            name: values.name,
            origin: values.origin,
            currency: values.currency,
            delivery_terms: values.delivery_terms
          };
          const clientResp = await clientService.createClient(clientPayload);
          const newClientId = clientResp.data?.data?.client_id || clientResp.data?.client_id;

          if (!newClientId) throw new Error("ID de cliente no recibido");

          // 2. Crear Dirección
          const addressPayload = {
            address_type: values.address_type,
            address_line: values.address_line,
            city: values.city,
            country: values.country
          };
          await clientService.addAddress(newClientId, addressPayload);

          // 3. Crear Contacto (Sólo si el usuario llenó algún campo del contacto)
          if (values.full_name || values.email || values.phone || values.role) {
            const contactPayload = {
              full_name: values.full_name,
              email: values.email,
              phone: values.phone,
              role: values.role
            };
            await clientService.addContact(newClientId, contactPayload);
          }

          notification.success({ message: 'Cliente completado exitosamente.' });
          setIsModalVisible(false);
          fetchClients();
        }
      } catch (error) {
        notification.error({
          message: 'Error en la operación',
          description: error.response?.data?.mensaje || error.message || 'Ocurrió un error inesperado al procesar la solicitud.'
        });
      } finally {
        setSaving(false);
      }
    });
  };

  const viewDetails = async (record) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const resp = await clientService.getClientById(record.client_id);
      const data = resp?.data?.data || resp?.data || resp;
      setSelectedClient(data);
    } catch (error) {
      notification.error({ message: 'Error al cargar detalle del cliente' });
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedClient = async (id) => {
    try {
      const resp = await clientService.getClientById(id);
      const data = resp?.data?.data || resp?.data || resp;
      setSelectedClient(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Addresses functions (Drawer)
  const openAddressModal = () => {
    addressForm.resetFields();
    setIsAddressModalVisible(true);
  };

  const onAddressModalOk = async () => {
    try {
      const values = await addressForm.validateFields();
      await clientService.addAddress(selectedClient.client_id, values);
      notification.success({ message: 'Dirección agregada correctamente' });
      setIsAddressModalVisible(false);
      refreshSelectedClient(selectedClient.client_id);
      fetchClients();
    } catch (error) {
      if (error.errorFields) return;
      notification.error({
        message: 'Error',
        description: error.response?.data?.mensaje || 'No se pudo agregar la dirección'
      });
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await clientService.deleteAddress(addressId);
      notification.success({ message: 'Dirección desactivada correctamente' });
      refreshSelectedClient(selectedClient.client_id);
      fetchClients();
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudo desactivar la dirección' });
    }
  };

  // Contacts functions (Drawer)
  const openContactModal = () => {
    contactForm.resetFields();
    setIsContactModalVisible(true);
  };

  const onContactModalOk = async () => {
    try {
      const values = await contactForm.validateFields();
      await clientService.addContact(selectedClient.client_id, values);
      notification.success({ message: 'Contacto agregado correctamente' });
      setIsContactModalVisible(false);
      refreshSelectedClient(selectedClient.client_id);
      fetchClients();
    } catch (error) {
      if (error.errorFields) return;
      notification.error({
        message: 'Error',
        description: error.response?.data?.mensaje || 'No se pudo agregar el contacto'
      });
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await clientService.deleteContact(contactId);
      notification.success({ message: 'Contacto desactivado correctamente' });
      refreshSelectedClient(selectedClient.client_id);
      fetchClients();
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudo desactivar el contacto' });
    }
  };

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
    c.code?.toLowerCase().includes(filters.search.toLowerCase())
  );

  const columnsDef = [
    {
      title: 'Código',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: 'Tipo de cliente',
      dataIndex: 'origin',
      key: 'origin',
    },
    {
      title: 'Moneda',
      dataIndex: 'currency',
      key: 'currency',
    },
    {
      title: 'Términos de entrega',
      dataIndex: 'delivery_terms',
      key: 'delivery_terms',
    },
    {
      title: 'Dirección',
      key: 'address',
      render: (_, record) => {
        const addr = record.addresses?.[0];
        if (!addr) return <Text type="secondary">—</Text>;
        return (
          <div>
            <Text>{addr.address_line}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {addr.city}, {addr.country} — {addr.address_type}
              </Text>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Contacto',
      key: 'full_name',
      render: (_, record) => record.contacts?.[0]?.full_name || '-',
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, record) => record.contacts?.[0]?.email || '-',
    },
    {
      title: 'Teléfono',
      key: 'phone',
      render: (_, record) => record.contacts?.[0]?.phone || '-',
    },
    {
      title: 'Cargo',
      key: 'role',
      render: (_, record) => record.contacts?.[0]?.role || '-',
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={STATUS_TAG_COLOR[status] || 'default'} style={{ fontWeight: 'bold' }}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Fecha creación',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => val ? new Date(val).toLocaleDateString('es-CO') : '-'
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Ver Detalles">
            <Button
              size="small"
              icon={<EyeOutlined />}
              style={{ borderColor: '#d9d9d9', color: '#1a3c2e' }}
              onClick={() => viewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Desactivar">
            <Popconfirm
              title="¿Desactivar Cliente?"
              description="Esta acción no se puede deshacer"
              onConfirm={() => handleDelete(record.client_id)}
              okText="Sí"
              cancelText="No"
            >
              <Button size="small" danger icon={<DeleteOutlined />} disabled={record.status === 'INACTIVO'} />
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

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600 }}>
            Clientes
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{ backgroundColor: '#1a3c2e' }}
          >
            Nuevo Cliente
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Buscar por nombre o código..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(val) => handleFilterChange('status', val)}
            >
              <Option value="TODOS">Todos</Option>
              <Option value="ACTIVO">ACTIVOS</Option>
              <Option value="INACTIVO">INACTIVOS</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={12} style={{ textAlign: 'right' }}>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigOpen(true)}
              style={{ borderRadius: 8 }}
            >
              Configurar Vista
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredClients}
        rowKey="client_id"
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{
          pageSizeOptions: ['25', '50', '100'],
          defaultPageSize: 25,
          showSizeChanger: true,
          showTotal: (total, range) => `Mostrando ${range[0]} - ${range[1]} de ${total} clientes`,
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

      {/* CREATE / EDIT MAIN MODAL */}
      <Modal
        title={isEdit ? "Editar Cliente" : "Nuevo Cliente"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={onModalOk}
        width={700}
        destroyOnClose
        confirmLoading={saving}
        okButtonProps={{ style: { backgroundColor: '#1a3c2e' } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Código" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="CLI-001" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Nombre Completo / Razón Social" maxLength={120} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="origin" label="Tipo de cliente" rules={[{ required: true, message: 'Requerido' }]}>
                <Select placeholder="Seleccionar" allowClear>
                  <Option value="NACIONAL">NACIONAL</Option>
                  <Option value="EXPORTACION">EXPORTACION</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label="Moneda" rules={[{ required: true, message: 'Requerido' }]}>
                <Select placeholder="Seleccionar" allowClear>
                  <Option value="COP">COP</Option>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="delivery_terms" label="Términos de Entrega" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="P. ej. FOB, CIF" maxLength={80} />
              </Form.Item>
            </Col>
          </Row>

          {isEdit && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="status" label="Estado">
                  <Select>
                    <Option value="ACTIVO">ACTIVO</Option>
                    <Option value="INACTIVO">INACTIVO</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {!isEdit && (
            <>
              <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
                Dirección
              </Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="address_type" label="Tipo" rules={[{ required: true, message: 'Requerido' }]}>
                    <Select placeholder="Seleccionar">
                      <Option value="ENTREGA">ENTREGA</Option>
                      <Option value="FISCAL">FISCAL</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="address_line" label="Dirección" rules={[{ required: true, message: 'Requerido' }]}>
                    <Input placeholder="Calle, Carrera, Av..." maxLength={200} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="city" label="Ciudad" rules={[{ required: true, message: 'Requerido' }]}>
                    <Input maxLength={80} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="country" label="País" rules={[{ required: true, message: 'Requerido' }]}>
                    <Input maxLength={60} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
                Contacto
              </Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="full_name" label="Nombre completo">
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ type: 'email', message: 'Email no válido' }]}
                  >
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="phone" label="Teléfono">
                    <Input maxLength={20} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="role" label="Cargo / Rol">
                    <Input maxLength={60} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>

      {/* DETAILS DRAWER */}
      <Drawer
        title={selectedClient ? `Detalle: ${selectedClient.name}` : 'Detalles'}
        width={520}
        onClose={() => {
          setDetailVisible(false);
          setSelectedClient(null);
        }}
        open={detailVisible}
      >
        <Spin spinning={detailLoading}>
          {selectedClient && (
            <div>
              <Title level={5}>Información del Cliente</Title>
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Código:</Text> <br /><Text strong>{selectedClient.code}</Text></Col>
                <Col span={12}><Text type="secondary">Nombre:</Text> <br /><Text strong>{selectedClient.name}</Text></Col>
                <Col span={12}><Text type="secondary">Tipo de cliente:</Text> <br /><Text>{selectedClient.origin}</Text></Col>
                <Col span={12}><Text type="secondary">Moneda:</Text> <br /><Text>{selectedClient.currency}</Text></Col>
                <Col span={12}><Text type="secondary">Estado:</Text> <br /><Tag color={STATUS_TAG_COLOR[selectedClient.status]}>{selectedClient.status}</Tag></Col>
                <Col span={24}><Text type="secondary">Términos de entrega:</Text> <br /><Text>{selectedClient.delivery_terms}</Text></Col>
              </Row>

              <Divider />

              <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Direcciones</Title>
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={openAddressModal}>
                  Agregar
                </Button>
              </Row>
              <List
                dataSource={selectedClient.addresses || []}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Popconfirm title="¿Desactivar dirección?" onConfirm={() => handleDeleteAddress(item.address_id)} okText="Sí" cancelText="No">
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Tag color="blue">{item.address_type}</Tag>}
                      description={
                        <div>
                          {item.address_line} <br />
                          {item.city}, {item.country}
                        </div>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay direcciones activas' }}
              />

              <Divider />

              <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Contactos</Title>
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={openContactModal}>
                  Agregar
                </Button>
              </Row>
              <List
                dataSource={selectedClient.contacts || []}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Popconfirm title="¿Desactivar contacto?" onConfirm={() => handleDeleteContact(item.contact_id)} okText="Sí" cancelText="No">
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Text strong>{item.full_name}</Text>}
                      description={
                        <div>
                          {item.role && <Tag style={{ marginBottom: 4 }}>{item.role}</Tag>}
                          <div>✉️ {item.email || '-'}</div>
                          <div>📞 {item.phone || '-'}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay contactos activos' }}
              />
            </div>
          )}
        </Spin>
      </Drawer>

      {/* ADDRESS MODAL (Used from Drawer) */}
      <Modal
        title="Agregar Dirección"
        open={isAddressModalVisible}
        onCancel={() => setIsAddressModalVisible(false)}
        onOk={onAddressModalOk}
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: '#1a3c2e' } }}
      >
        <Form form={addressForm} layout="vertical">
          <Form.Item name="address_type" label="Tipo" rules={[{ required: true, message: 'Requerido' }]}>
            <Select placeholder="ENTREGA / FISCAL">
              <Option value="ENTREGA">ENTREGA</Option>
              <Option value="FISCAL">FISCAL</Option>
            </Select>
          </Form.Item>
          <Form.Item name="address_line" label="Dirección" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Calle, Carrera, Av..." maxLength={200} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="Ciudad" rules={[{ required: true, message: 'Requerido' }]}>
                <Input maxLength={80} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="country" label="País" rules={[{ required: true, message: 'Requerido' }]}>
                <Input maxLength={60} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* CONTACT MODAL (Used from Drawer) */}
      <Modal
        title="Agregar Contacto"
        open={isContactModalVisible}
        onCancel={() => setIsContactModalVisible(false)}
        onOk={onContactModalOk}
        destroyOnClose
        okButtonProps={{ style: { backgroundColor: '#1a3c2e' } }}
      >
        <Form form={contactForm} layout="vertical">
          <Form.Item name="full_name" label="Nombre completo" rules={[{ required: true, message: 'Requerido' }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Requerido' }, { type: 'email', message: 'No válido' }]}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono" rules={[{ required: true, message: 'Requerido' }]}>
                <Input maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="role" label="Cargo / Rol" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej. Comprador, Gerente..." maxLength={60} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
