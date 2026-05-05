import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Modal, Form, Drawer,
  notification, Typography, Tag, Row, Col, Divider, Checkbox,
  Badge, Switch, Alert, Tooltip, Skeleton, Popconfirm,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ClearOutlined, EditOutlined,
  StopOutlined, CheckCircleOutlined, KeyOutlined, SafetyOutlined,
  SettingOutlined, CheckOutlined, CloseOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';
import {
  getUsers, createUser, updateUser, toggleUser,
  resetPassword, getUserPermissions, updateUserPermissions, getRoles,
} from '../../../services/userService';
import useTablePreferences from '../../../hooks/useTablePreferences';
import TableConfigDrawer from '../../../components/TableConfig/TableConfigDrawer';

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

const PRIMARY = '#1a3c2e';
const ACTIVE_COLOR = '#52b788';

const MODULES = [
  { key: 'PRODUCTS', label: 'Productos' },
  { key: 'INVENTORY', label: 'Inventario' },
  { key: 'FARM', label: 'Cultivo' },
  { key: 'SALES', label: 'Ventas' },
  { key: 'CLIENTS', label: 'Clientes' },
  { key: 'SETTINGS', label: 'Configuración' },
  { key: 'REPORTS', label: 'Reportes' },
];

const PERMISSION_ACTIONS = [
  { key: 'can_view', label: 'Ver' },
  { key: 'can_create', label: 'Crear' },
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_delete', label: 'Eliminar' },
];

const ALL_COLUMN_KEYS = [
  { key: 'full_name', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Rol' },
  { key: 'is_active', label: 'Estado' },
  { key: 'created_at', label: 'Fecha Creación' },
  { key: 'actions', label: 'Acciones' },
];
const DEFAULT_VISIBLE_KEYS = ['full_name', 'email', 'role', 'is_active', 'actions'];

function getLoggedUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded = jwtDecode(token);
    return String(decoded.id ?? decoded.user_id ?? decoded.sub ?? '');
  } catch {
    return null;
  }
}

const defaultPermissions = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
    return acc;
  }, {});

const UsersPage = () => {
  const loggedUserId = getLoggedUserId();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputRole, setInputRole] = useState('');
  const [inputStatus, setInputStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  const { visibleColumns, pinnedColumns, toggleVisible, togglePinned } =
    useTablePreferences('columns_users', DEFAULT_VISIBLE_KEYS);
  const [configOpen, setConfigOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [savingReset, setSavingReset] = useState(false);
  const [resetForm] = Form.useForm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [permissions, setPermissions] = useState(defaultPermissions());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    getRoles()
      .then((data) => setRoles(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => { });
    fetchUsers({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = useCallback(async (filters) => {
    setLoading(true);
    try {
      const data = await getUsers(filters);
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setUsers(list);
      setTotalCount(list.length);
      setSelectedRowKeys([]);
    } catch (err) {
      notification.error({
        message: 'Error al cargar usuarios',
        description: err?.response?.data?.mensaje || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    const filters = {
      full_name: inputName.trim(),
      email: inputEmail.trim(),
      role_id: inputRole,
      is_active: inputStatus,
    };
    setAppliedFilters(filters);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchUsers(filters);
  };

  const handleClear = () => {
    setInputName(''); setInputEmail(''); setInputRole(''); setInputStatus('');
    const filters = {};
    setAppliedFilters(filters);
    setPagination((p) => ({ ...p, current: 1 }));
    fetchUsers(filters);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setModalMode('edit');
    setEditingUser(record);
    form.setFieldsValue({
      full_name: record.full_name,
      email: record.email,
      role_id: String(record.role?.role_id ?? record.role_id ?? ''),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingUser(null);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await createUser(values);
        notification.success({ message: 'Usuario creado correctamente' });
      } else {
        const { password, ...rest } = values;
        await updateUser(editingUser.user_id, rest);
        notification.success({ message: 'Usuario actualizado correctamente' });
      }
      closeModal();
      fetchUsers(appliedFilters);
    } catch (err) {
      notification.error({
        message: modalMode === 'create' ? 'Error al crear usuario' : 'Error al actualizar usuario',
        description: err?.response?.data?.mensaje || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (record) => {
    try {
      await toggleUser(record.user_id);
      notification.success({
        message: `Usuario ${record.is_active ? 'inactivado' : 'activado'} correctamente`,
      });
      fetchUsers(appliedFilters);
    } catch (err) {
      notification.error({
        message: 'Error al cambiar estado',
        description: err?.response?.data?.mensaje || err.message,
      });
    }
  };

  const handleBulk = async (action) => {
    setBulkLoading(true);
    const errors = [];
    let targetIds = [...selectedRowKeys];
    if (action === 'activate') {
      const inactiveIds = new Set(users.filter((u) => !u.is_active).map((u) => String(u.user_id)));
      targetIds = targetIds.filter((k) => inactiveIds.has(String(k)));
    } else {
      const activeIds = new Set(users.filter((u) => u.is_active).map((u) => String(u.user_id)));
      targetIds = targetIds.filter((k) => activeIds.has(String(k)));
    }
    if (targetIds.length === 0) {
      setBulkLoading(false);
      notification.info({ message: 'Sin cambios necesarios' });
      return;
    }
    await Promise.allSettled(
      targetIds.map(async (id) => {
        try { await toggleUser(id); } catch (err) { errors.push(err); }
      })
    );
    setBulkLoading(false);
    if (errors.length === 0)
      notification.success({ message: `${targetIds.length} usuario(s) ${action === 'activate' ? 'activados' : 'inactivados'}` });
    else
      notification.warning({ message: 'Algunas acciones fallaron' });
    fetchUsers(appliedFilters);
  };

  const openResetModal = (record) => {
    setResetTarget(record);
    resetForm.resetFields();
    setResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    let values;
    try { values = await resetForm.validateFields(); } catch { return; }

    setSavingReset(true);
    try {
      await resetPassword(resetTarget.user_id, values.new_password);
      notification.success({ message: 'Contraseña actualizada correctamente' });
      setResetModalOpen(false);
      resetForm.resetFields();
      setResetTarget(null);
    } catch (err) {
      notification.error({
        message: 'Error al resetear contraseña',
        description: err?.response?.data?.mensaje || err.message,
      });
    } finally {
      setSavingReset(false);
    }
  };

  const openDrawer = async (record) => {
    setDrawerUser(record);
    setDrawerOpen(true);
    if (record.is_super_admin) return;

    setLoadingPerms(true);
    try {
      const data = await getUserPermissions(record.user_id);
      const list = Array.isArray(data) ? data : (data.data ?? []);
      const map = defaultPermissions();
      list.forEach(({ module, can_view, can_create, can_edit, can_delete }) => {
        if (map[module]) {
          map[module] = { can_view, can_create, can_edit, can_delete };
        }
      });
      setPermissions(map);
    } catch (err) {
      notification.error({
        message: 'Error al cargar permisos',
        description: err?.response?.data?.mensaje || err.message,
      });
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSavePermissions = async () => {
    const permisos = MODULES.map(({ key }) => ({
      module: key,
      ...permissions[key],
    }));
    setSavingPerms(true);
    try {
      await updateUserPermissions(drawerUser.user_id, permisos);
      notification.success({ message: 'Permisos guardados correctamente' });
      setDrawerOpen(false);
    } catch (err) {
      notification.error({
        message: 'Error al guardar permisos',
        description: err?.response?.data?.mensaje || err.message,
      });
    } finally {
      setSavingPerms(false);
    }
  };

  const setPermAction = (module, action, value) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: value },
    }));
  };

  const pagedData = users.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const skeletonRows = Array.from({ length: 6 }, (_, i) => ({
    key: `sk-${i}`,
    full_name: <Skeleton.Input active size="small" style={{ width: 130 }} />,
    email: <Skeleton.Input active size="small" style={{ width: 160 }} />,
    role: <Skeleton.Input active size="small" style={{ width: 80 }} />,
    is_active: <Skeleton.Button active size="small" style={{ width: 60 }} />,
    created_at: <Skeleton.Input active size="small" style={{ width: 100 }} />,
    actions: <Skeleton.Button active size="small" />,
  }));

  const isOwnAccount = (record) => String(record.user_id) == loggedUserId;

  const allColumns = [
    {
      title: 'Nombre', dataIndex: 'full_name', key: 'full_name',
      sorter: (a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''),
      render: (text, record) => (
        <Space size={6}>
          <Text strong>{text}</Text>
          {record.is_super_admin && (
            <Tooltip title="Super Administrador">
              <Tag color="gold" style={{ fontSize: 10, padding: '0 4px' }}>SA</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Email', dataIndex: 'email', key: 'email',
      render: (text) => <Text style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: 'Rol', dataIndex: 'role', key: 'role',
      render: (role) => role?.name
        ? <Tag color="geekblue" style={{ fontWeight: 500 }}>{role.name}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado', dataIndex: 'is_active', key: 'is_active', width: 110, align: 'center',
      render: (active) => active
        ? <Tag color="success">Activo</Tag>
        : <Tag color="error">Inactivo</Tag>,
    },
    {
      title: 'Fecha Creación', dataIndex: 'created_at', key: 'created_at', width: 150,
      render: (date) => date
        ? new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    },
    {
      title: 'Acciones', key: 'actions', width: 200, align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }} />
          </Tooltip>

          {!record.is_super_admin && !isOwnAccount(record) && (
            <Tooltip title={record.is_active ? 'Inactivar' : 'Activar'}>
              <Popconfirm
                title={`¿${record.is_active ? 'Inactivar' : 'Activar'} al usuario "${record.full_name}"?`}
                okText="Confirmar" cancelText="Cancelar"
                okType={record.is_active ? 'danger' : 'primary'}
                onConfirm={() => handleToggle(record)}
              >
                <Button size="small"
                  icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                  style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }}
                />
              </Popconfirm>
            </Tooltip>
          )}

          <Tooltip title="Resetear contraseña">
            <Button size="small" icon={<KeyOutlined />}
              onClick={() => openResetModal(record)}
              style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }} />
          </Tooltip>

          {!record.is_super_admin && (
            <Tooltip title="Permisos">
              <Button size="small" icon={<SafetyOutlined />}
                onClick={() => openDrawer(record)}
                style={{ borderColor: '#d9d9d9', color: '#8c8c8c' }} />
            </Tooltip>
          )}
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

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#595959', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Usuarios
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
              type="primary" icon={<PlusOutlined />}
              onClick={openCreateModal}
              style={{ background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8, height: 38 }}
            >
              Nuevo Usuario
            </Button>
          </Space>
        </Col>
      </Row>

      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input placeholder="Buscar por nombre" prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={inputName} onChange={(e) => setInputName(e.target.value)}
              onKeyDown={handleKeyDown} allowClear style={{ borderRadius: 8 }} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input placeholder="Buscar por email" prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              value={inputEmail} onChange={(e) => setInputEmail(e.target.value)}
              onKeyDown={handleKeyDown} allowClear style={{ borderRadius: 8 }} />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select placeholder="Rol" value={inputRole || undefined}
              onChange={(v) => setInputRole(v ?? '')} allowClear style={{ width: '100%' }}>
              {roles.map((r) => (
                <Option key={String(r.role_id)} value={String(r.role_id)}>{r.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select placeholder="Estado" value={inputStatus || undefined}
              onChange={(v) => setInputStatus(v ?? '')} allowClear style={{ width: '100%' }}>
              <Option value="true">Activos</Option>
              <Option value="false">Inactivos</Option>
            </Select>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}
                style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}>Buscar</Button>
              <Button icon={<ClearOutlined />} onClick={handleClear} style={{ borderRadius: 8 }}>Limpiar</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {selectedRowKeys.length > 0 && (
        <div style={{
          background: '#f0f7f4', border: '1.5px solid #52b788', borderRadius: 10,
          padding: '10px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <Badge count={selectedRowKeys.length} style={{ backgroundColor: PRIMARY }} />
          <Text strong style={{ color: PRIMARY }}>
            {selectedRowKeys.length} {selectedRowKeys.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}
          </Text>
          <Divider type="vertical" style={{ borderColor: ACTIVE_COLOR }} />
          <Space wrap>
            <Button size="small" icon={<CheckOutlined />} loading={bulkLoading}
              onClick={() => handleBulk('activate')}
              style={{ borderColor: ACTIVE_COLOR, color: ACTIVE_COLOR, fontWeight: 600, borderRadius: 6 }}>Activar</Button>
            <Button size="small" icon={<StopOutlined />} loading={bulkLoading}
              onClick={() => handleBulk('deactivate')}
              style={{ borderColor: '#faad14', color: '#faad14', fontWeight: 600, borderRadius: 6 }}>Inactivar</Button>
            <Button size="small" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} style={{ borderRadius: 6 }}>
              Limpiar selección
            </Button>
          </Space>
        </div>
      )}

      {!loading && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
          Mostrando <strong>{Math.min(pagination.pageSize, pagedData.length)}</strong> de{' '}
          <strong>{totalCount}</strong> {totalCount === 1 ? 'usuario' : 'usuarios'}
        </Text>
      )}

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <Table
          rowKey="user_id"
          columns={columns}
          dataSource={loading ? skeletonRows : pagedData}
          loading={false}
          rowSelection={loading ? undefined : {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record) => ({
              disabled: record.is_super_admin || isOwnAccount(record),
            }),
            columnWidth: 40,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: users.length,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            style: { padding: '12px 16px' },
          }}
          size="middle"
          style={{ borderRadius: 12 }}
        />
      </div>

      {/* MODAL CREAR / EDITAR */}
      <Modal
        title={
          <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 16 }}>
            {modalMode === 'create' ? '✦ Nuevo Usuario' : '✎ Editar Usuario'}
          </span>
        }
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        okText={modalMode === 'create' ? 'Crear' : 'Guardar'}
        cancelText="Cancelar"
        confirmLoading={saving}
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={480}
        destroyOnClose
        bodyStyle={{ paddingTop: 8 }}
      >
        <Divider style={{ margin: '8px 0 20px' }} />
        <Form form={form} layout="vertical">
          <Form.Item label={<Text strong>Nombre completo</Text>} name="full_name"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
            <Input placeholder="Juan García" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item label={<Text strong>Email</Text>} name="email"
            rules={[
              { required: true, message: 'El email es obligatorio' },
              { type: 'email', message: 'Ingresa un email válido' },
            ]}>
            <Input placeholder="usuario@floracore.com" style={{ borderRadius: 8 }} />
          </Form.Item>

          {modalMode === 'create' && (
            <Form.Item label={<Text strong>Contraseña</Text>} name="password"
              rules={[
                { required: true, message: 'La contraseña es obligatoria' },
                { min: 8, message: 'Mínimo 8 caracteres' },
              ]}>
              <Password placeholder="Mínimo 8 caracteres" style={{ borderRadius: 8 }} />
            </Form.Item>
          )}

          <Form.Item name="role_id" label={<>Rol <Text type="secondary" style={{ fontSize: 12 }}>(opcional)</Text></>}>
            <Select placeholder="Seleccionar rol" allowClear style={{ borderRadius: 8 }}>
              {roles.map((r) => (
                <Option key={String(r.role_id)} value={String(r.role_id)}>{r.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL RESETEAR CONTRASEÑA */}
      <Modal
        title={
          <span style={{ color: PRIMARY, fontWeight: 700, fontSize: 15 }}>
            🔑 Resetear Contraseña — {resetTarget?.full_name}
          </span>
        }
        open={resetModalOpen}
        onCancel={() => { setResetModalOpen(false); resetForm.resetFields(); setResetTarget(null); }}
        onOk={handleResetPassword}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={savingReset}
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY, fontWeight: 600, borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={420}
        destroyOnClose
        bodyStyle={{ paddingTop: 8 }}
      >
        <Divider style={{ margin: '8px 0 20px' }} />
        <Form form={resetForm} layout="vertical">
          <Form.Item label={<Text strong>Nueva contraseña</Text>} name="new_password"
            rules={[
              { required: true, message: 'La contraseña es obligatoria' },
              { min: 8, message: 'Mínimo 8 caracteres' },
            ]}>
            <Password placeholder="Mínimo 8 caracteres" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            label={<Text strong>Confirmar contraseña</Text>}
            name="confirm_password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Confirma la contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value)
                    return Promise.resolve();
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Password placeholder="Repite la contraseña" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* DRAWER PERMISOS */}
      <Drawer
        title={
          <Text strong style={{ color: PRIMARY, fontSize: 15 }}>
            Permisos de: {drawerUser?.full_name}
          </Text>
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerUser(null); setPermissions(defaultPermissions()); }}
        width={600}
        extra={
          !drawerUser?.is_super_admin && (
            <Button
              type="primary"
              loading={savingPerms}
              onClick={handleSavePermissions}
              style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
            >
              Guardar Permisos
            </Button>
          )
        }
      >
        {drawerUser?.is_super_admin ? (
          <Alert
            type="success"
            showIcon
            icon={<SafetyOutlined />}
            message="Acceso total al sistema"
            description="Este usuario es Super Administrador y tiene acceso completo a todos los módulos sin restricciones."
            style={{ borderRadius: 10 }}
          />
        ) : loadingPerms ? (
          <Space direction="vertical" style={{ width: '100%', paddingTop: 20 }}>
            {MODULES.map((m) => (
              <Skeleton.Input key={m.key} active style={{ width: '100%', height: 40 }} />
            ))}
          </Space>
        ) : (
          <Table
            size="small"
            pagination={false}
            dataSource={MODULES.map((m) => ({ ...m, ...permissions[m.key] }))}
            rowKey="key"
            style={{ borderRadius: 10, overflow: 'hidden' }}
            columns={[
              {
                title: 'Módulo', dataIndex: 'label', key: 'label',
                render: (text) => <Text strong style={{ color: PRIMARY }}>{text}</Text>,
              },
              ...PERMISSION_ACTIONS.map(({ key: action, label }) => ({
                title: label, key: action, width: 80, align: 'center',
                render: (_, row) => (
                  <Switch
                    size="small"
                    checked={!!permissions[row.key]?.[action]}
                    onChange={(val) => setPermAction(row.key, action, val)}
                    style={permissions[row.key]?.[action] ? { backgroundColor: ACTIVE_COLOR } : {}}
                  />
                ),
              })),
            ]}
          />
        )}
      </Drawer>

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

export default UsersPage;
