import React from 'react';
import { login } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, message } from 'antd';

const Login = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const data = await login(values.email, values.password);
      localStorage.setItem('token', data.token);
      navigate('/home');
    } catch (error) {
      message.error('Email o contraseña incorrectos');
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <Form
      name="basic"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{ maxWidth: 600 }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Form.Item
        label="Email"
        name="email"
        rules={[{ required: true, message: 'El email es requerido' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: 'La contraseña es requerida' }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item label={null}>
        <Button type="primary" htmlType="submit">
          Ingresar
        </Button>
      </Form.Item>
    </Form>
  );
};

export default Login;