import React, { useState } from 'react';
import { login } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Card, Divider, Alert } from 'antd';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const data = await login(values.email, values.password);
      localStorage.setItem('token', data.token);
      navigate('/home');
    } catch (err) {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a3c2e 0%, #0d1f17 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          border: 'none',
        }}
        styles={{ body: { padding: '32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', lineHeight: '1', marginBottom: '12px' }}>🌿</div>
          <h1
            style={{
              color: '#1a3c2e',
              fontSize: '28px',
              fontWeight: 'bold',
              margin: '0',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            FloraCore
          </h1>
          <p style={{ color: '#8c8c8c', fontSize: '13px', margin: '4px 0 0 0' }}>
            Tecnologia en el campo
          </p>
        </div>

        <Divider style={{ margin: '0 0 24px 0', borderColor: '#f0f0f0' }} />

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '20px', borderRadius: '8px' }}
          />
        )}

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          autoComplete="off"
        >
          <Form.Item
            label={<span style={{ fontWeight: 500 }}>Email</span>}
            name="email"
            rules={[{ required: true, message: 'El email es requerido' }]}
          >
            <Input size="large" placeholder="ejemplo@floracore.com" />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 500 }}>Contraseña</span>}
            name="password"
            rules={[{ required: true, message: 'La contraseña es requerida' }]}
            style={{ marginBottom: '32px' }}
          >
            <Input.Password size="large" placeholder="Ingresa tu contraseña" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              style={{
                backgroundColor: '#1a3c2e',
                borderColor: '#1a3c2e',
                height: '44px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div
        style={{
          marginTop: '32px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          letterSpacing: '0.5px',
        }}
      >
        FloraCore © 2026
      </div>
    </div>
  );
};

export default Login;