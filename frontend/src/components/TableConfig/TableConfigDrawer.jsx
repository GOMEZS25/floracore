import React from 'react';
import { Drawer, Checkbox, Space, Typography, Button } from 'antd';
import { PushpinOutlined, PushpinFilled, SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const TableConfigDrawer = ({
  open,
  onClose,
  columns,
  visibleColumns,
  pinnedColumns,
  onToggleVisible,
  onTogglePinned
}) => {
  return (
    <Drawer
      title="Configurar tabla"
      placement="right"
      onClose={onClose}
      open={open}
      width={320}
    >
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ color: '#8c8c8c' }}>
          Puedes fijar una columna a la izquierda de la tabla y mostrar / ocultar columnas
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {columns.map((col) => {
          const isPinned = pinnedColumns.has(col.key);
          const isVisible = visibleColumns.has(col.key);
          const isActions = col.key === 'actions' || col.key === 'acciones';

          return (
            <div
              key={col.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <span style={{ fontSize: '14px', color: '#595959' }}>
                {col.label || col.title}
              </span>
              <Space size="middle">
                {isPinned ? (
                  <PushpinFilled
                    style={{ color: '#1a3c2e', cursor: 'pointer', fontSize: '16px' }}
                    onClick={() => onTogglePinned(col.key)}
                  />
                ) : (
                  <PushpinOutlined
                    style={{ color: '#d9d9d9', cursor: 'pointer', fontSize: '16px' }}
                    onClick={() => onTogglePinned(col.key)}
                  />
                )}
                {isActions ? null : (
                  <Checkbox
                    checked={isVisible}
                    onChange={() => onToggleVisible(col.key)}
                  />
                )}
              </Space>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
};

export default TableConfigDrawer;
