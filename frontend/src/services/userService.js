import axiosInstance from './axiosInstance';

const getUsers = async (filters = {}) => {
  const params = {};
  if (filters.full_name) params.full_name = filters.full_name;
  if (filters.email) params.email = filters.email;
  if (filters.role_id) params.role_id = filters.role_id;
  if (filters.is_active !== undefined && filters.is_active !== '') params.is_active = filters.is_active;

  const response = await axiosInstance.get('/users', { params });
  return response.data;
};

const createUser = async (data) => {
  const response = await axiosInstance.post('/users', data);
  return response.data;
};

const updateUser = async (id, data) => {
  const response = await axiosInstance.patch(`/users/${id}`, data);
  return response.data;
};

const toggleUser = async (id) => {
  const response = await axiosInstance.patch(`/users/${id}/toggle`, {});
  return response.data;
};

const resetPassword = async (id, new_password) => {
  const response = await axiosInstance.patch(`/users/${id}/reset-password`, { new_password });
  return response.data;
};

const getUserPermissions = async (id) => {
  const response = await axiosInstance.get(`/users/${id}/permissions`);
  return response.data;
};

const updateUserPermissions = async (id, permisos) => {
  const response = await axiosInstance.put(`/users/${id}/permissions`, { permisos });
  return response.data;
};

const getRoles = async () => {
  const response = await axiosInstance.get('/roles');
  return response.data;
};

export {
  getUsers,
  createUser,
  updateUser,
  toggleUser,
  resetPassword,
  getUserPermissions,
  updateUserPermissions,
  getRoles,
};
