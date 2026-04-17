import React, { useState, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space, theme } from 'antd';
import {
  HomeOutlined,
  InboxOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const COLORS = {
  siderBg: '#1a3c2e',
  hoverBg: '#2d6a4f',
  activeBg: '#52b788',
  activeText: '#ffffff',
  menuText: '#c8e6c9',
  logo: '#52b788',
};

function getUserFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded = jwtDecode(token);
    return {
      name: decoded.nombre || decoded.name || decoded.email || 'Usuario',
      email: decoded.email || '',
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
  {
    key: 'cultivo',
    icon: <EnvironmentOutlined />,
    label: 'Cultivo',
    children: [
      { key: '/farm/sowings', label: 'Siembras', navigate: '/farm/sowings' },
      { key: '/farm/projections', label: 'Proyecciones', navigate: '/farm/projections' },
    ],
  },
  {
    key: 'ventas',
    icon: <ShoppingCartOutlined />,
    label: 'Ventas',
    children: [
      { key: '/sales/orders', label: 'Órdenes de Venta', navigate: '/sales/orders' },
      { key: '/sales/clients', label: 'Clientes', navigate: '/sales/clients' },
      { key: '/sales/categories', label: 'Categorías', navigate: '/sales/categories' },
    ],
  },
  {
    key: 'productos',
    icon: <TagOutlined />,
    label: 'Productos',
    children: [
      { key: '/products/list',       label: 'Productos',   navigate: '/products/list' },
      { key: '/products/categories', label: 'Categorías',  navigate: '/products/categories' },
    ],
  },
  {
    key: 'configuracion',
    icon: <SettingOutlined />,
    label: 'Configuración',
    children: [
      { key: '/settings/users', label: 'Usuarios', navigate: '/settings/users' },
      { key: '/settings/attributes', label: 'Atributos', navigate: '/settings/attributes' },
      { key: '/settings/packaging', label: 'Empaques', navigate: '/settings/packaging' },
    ],
  },
];

const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => getUserFromToken(), []);

  // Determinar qué submenú abrir según la URL actual
  const defaultOpenKeys = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/inventory')) return ['inventario'];
    if (path.startsWith('/farm')) return ['cultivo'];
    if (path.startsWith('/sales')) return ['ventas'];
    if (path.startsWith('/products')) return ['productos'];
    if (path.startsWith('/settings')) return ['configuracion'];
    return [];
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const buildMenuItems = (items) =>
    items.map(({ key, icon, label, navigate: nav, children: ch }) => ({
      key,
      icon,
      label,
      children: ch
        ? ch.map((child) => ({
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
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={230}
        collapsedWidth={72}
        style={{
          background: COLORS.siderBg,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
          boxShadow: '2px 0 12px rgba(0,0,0,0.18)',
          transition: 'width 0.2s',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingLeft: collapsed ? 0 : 20,
            gap: 10,
            borderBottom: `1px solid rgba(255,255,255,0.08)`,
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontSize: collapsed ? 26 : 22,
              lineHeight: 1,
              filter: 'drop-shadow(0 0 6px #52b78888)',
              transition: 'font-size 0.2s',
            }}
          >
            🌿
          </span>
          {!collapsed && (
            <Text
              style={{
                color: COLORS.logo,
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: 1,
                fontFamily: "'Inter', sans-serif",
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              FloraCore
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={collapsed ? [] : defaultOpenKeys}
          items={buildMenuItems(menuItems)}
          onClick={handleMenuClick}
          inlineIndent={16}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
            color: COLORS.menuText,
          }}
          theme="dark"
        />

        <style>{`
          .ant-menu-dark .ant-menu-item:hover,
          .ant-menu-dark .ant-menu-submenu-title:hover {
            background-color: ${COLORS.hoverBg} !important;
          }
          .ant-menu-dark .ant-menu-item-selected {
            background-color: ${COLORS.activeBg} !important;
            color: ${COLORS.activeText} !important;
          }
          .ant-menu-dark.ant-menu-dark:not(.ant-menu-horizontal)
            .ant-menu-item-selected {
            background-color: ${COLORS.activeBg} !important;
          }
          .ant-menu-dark .ant-menu-sub {
            background: rgba(0,0,0,0.15) !important;
          }
          .ant-menu-dark .ant-menu-submenu-selected > .ant-menu-submenu-title {
            color: ${COLORS.activeBg} !important;
          }
          .ant-layout-sider-trigger {
            display: none !important;
          }
        `}</style>
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 72 : 230,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
            background: '#ffffff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            height: 64,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 18,
              color: COLORS.siderBg,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              transition: 'background 0.2s',
            }}
          />

          <Text
            style={{
              color: COLORS.siderBg,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 0.5,
              fontFamily: "'Inter', sans-serif",
              flex: 1,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {!collapsed ? '' : 'FloraCore ERP'}
          </Text>

          {user ? (
            <Dropdown
              menu={{ items: userDropdownItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              arrow
              trigger={['click']}
            >
              <Space
                style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                  userSelect: 'none',
                }}
                className="user-dropdown-trigger"
              >
                <Avatar
                  size={34}
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.hoverBg}, ${COLORS.activeBg})`,
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {user.initials}
                </Avatar>
                <Text
                  style={{
                    color: '#1a3c2e',
                    fontWeight: 500,
                    fontSize: 14,
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </Text>
                <DownOutlined style={{ fontSize: 11, color: '#888' }} />
              </Space>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ borderRadius: 8 }}
            >
              Salir
            </Button>
          )}
        </Header>

        <style>{`
          .user-dropdown-trigger:hover {
            background: #f0f7f2 !important;
          }
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        `}</style>

        <Content
          style={{
            background: '#f5f5f5',
            minHeight: 'calc(100vh - 64px)',
            padding: 24,
            overflowY: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
