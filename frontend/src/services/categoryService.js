import axiosInstance from './axiosInstance';

const getCategories = async (filters = {}) => {
  const params = {};
  if (filters.name) params.name = filters.name;
  if (filters.reference) params.reference = filters.reference;
  if (filters.is_active !== undefined && filters.is_active !== '')
    params.is_active = filters.is_active;

  const response = await axiosInstance.get('/categories', { params });
  return response.data;
};

const createCategory = async (data) => {
  const body = {
    name: data.name,
    reference: data.reference,
    parent_id: data.parent_id ?? null,
  };
  const response = await axiosInstance.post('/categories', body);
  return response.data;
};

const updateCategory = async (id, data) => {
  const body = {
    name: data.name,
    reference: data.reference,
    ...(data.is_active !== undefined && { is_active: data.is_active }),
    parent_id: data.parent_id ?? null,
  };
  const response = await axiosInstance.put(`/categories/${id}`, body);
  return response.data;
};

const deleteCategory = async (id) => {
  const response = await axiosInstance.delete(`/categories/${id}`);
  return response.data;
};

const toggleCategory = async (id) => {
  const response = await axiosInstance.patch(`/categories/${id}/toggle`, {});
  return response.data;
};

export { getCategories, createCategory, updateCategory, deleteCategory, toggleCategory };
