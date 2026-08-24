import React, { useMemo } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Space } from 'antd';
import {
  HomeOutlined,
  InboxOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const { Header, Content } = Layout;
const { Text } = Typography;

function getUserFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded = jwtDecode(token);
    return {
      name: decoded.nombre || decoded.name || decoded.email || 'Usuario',
      email: decoded.email || '',
      isAdmin: decoded.esAdmin === true,
      initials: (decoded.nombre || decoded.name || 'U')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase(),
    };
  } catch {
    return null;
  }
}

const menuItems = [
  {
    key: '/home',
    icon: <HomeOutlined />,
    label: 'Home',
    navigate: '/home',
  },
  {
    key: 'inventario',
    icon: <InboxOutlined />,
    label: 'Inventario',
    children: [
      { key: '/inventory/locations', label: 'Ubicaciones', navigate: '/inventory/locations' },
      { key: '/inventory/lots', label: 'Lotes', navigate: '/inventory/lots' },
    ],
  },


  /*
  {
    key: 'cultivo',
    icon: <EnvironmentOutlined />,
    label: 'Cultivo',
    children: [
      { key: '/farm/sowings', label: 'Siembras', navigate: '/farm/sowings' },
      { key: '/farm/projections', label: 'Proyecciones', navigate: '/farm/projections' },
    ],
  },
  */

  {
    key: 'ventas',
    icon: <ShoppingCartOutlined />,
    label: 'Ventas',
    children: [
      { key: '/sales/orders', label: 'Órdenes de Venta', navigate: '/sales/orders' },
      { key: '/sales/clients', label: 'Clientes', navigate: '/sales/clients' },
      /*{ key: '/sales/categories', label: 'Categorías', navigate: '/sales/categories' },*/
    ],
  },
  {
    key: 'productos',
    icon: <TagOutlined />,
    label: 'Productos',
    children: [
      { key: '/products/list', label: 'Productos', navigate: '/products/list' },
      { key: '/products/categories', label: 'Categorías', navigate: '/products/categories' },
      { key: "/products/attributes", label: "Atributos", navigate: "/products/attributes" }
    ],
  },
  {
    key: 'configuracion',
    icon: <SettingOutlined />,
    label: 'Configuración',
    children: [
      { key: '/settings/users', label: 'Usuarios', navigate: '/settings/users' },
      { key: '/settings/system', label: 'Sistema', navigate: '/settings/system', adminOnly: true },
      /*{ key: '/settings/packaging', label: 'Empaques', navigate: '/settings/packaging' },*/
    ],
  },
];

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUserFromToken(), []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const buildMenuItems = (items, isAdmin) =>
    items
      .filter((item) => !item.adminOnly || isAdmin)
      .map(({ key, icon, label, children: ch }) => ({
        key,
        icon,
        label,
        children: ch
          ? ch
            .filter((child) => !child.adminOnly || isAdmin)
            .map((child) => ({
              key: child.key,
              label: child.label,
            }))
          : undefined,
      }));

  const handleMenuClick = ({ key }) => {
    for (const item of menuItems) {
      if (item.navigate && item.key === key) {
        navigate(item.navigate);
        return;
      }
      if (item.children) {
        const child = item.children.find((c) => c.key === key);
        if (child) {
          navigate(child.navigate);
          return;
        }
      }
    }
  };

  const userDropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      danger: true,
    },
  ];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') handleLogout();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--fc-surface-dark)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: 64,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40 }}>
          <span style={{ fontSize: 22 }}>🌿</span>
          <Text style={{
            color: 'var(--fc-accent)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: 0.5,
            fontFamily: "'Inter', sans-serif",
          }}>
            FloraCore
          </Text>
        </div>

        <Menu
          mode="horizontal"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={buildMenuItems(menuItems, user?.isAdmin)}
          onClick={handleMenuClick}
          style={{
            flex: 1,
            background: 'transparent',
            borderBottom: 'none',
            minWidth: 0,
          }}
        />

        {user && (
          <Dropdown
            menu={{ items: userDropdownItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Space style={{ cursor: 'pointer', color: 'var(--fc-text-on-dark)' }}>
              <Avatar
                size={28}
                style={{
                  background: 'var(--fc-accent)',
                  fontWeight: 700,
                  fontSize: 12,
                  color: '#fff',
                }}
              >
                {user.initials}
              </Avatar>
              <Text style={{ color: 'var(--fc-text-on-dark)', fontSize: 13 }}>
                {user.name}
              </Text>
            </Space>
          </Dropdown>
        )}
      </Header>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>

      <Content
        style={{
          background: 'var(--fc-page-bg)',
          minHeight: 'calc(100vh - 64px)',
          padding: '24px',
        }}
      >
        {children}
      </Content>
    </Layout>
  );
};

export default AppLayout;
