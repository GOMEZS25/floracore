import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/**
 * GET /categories?name=&reference=&is_active=
 * @param {Object} filters - { name, reference, is_active }
 */
const getCategories = async (filters = {}) => {
  const params = {};
  if (filters.name) params.name = filters.name;
  if (filters.reference) params.reference = filters.reference;
  if (filters.is_active !== undefined && filters.is_active !== '')
    params.is_active = filters.is_active;

  const response = await axios.get(`${BASE_URL}/categories`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

/**
 * POST /categories
 * @param {Object} data - { name, reference, parent_id? }
 */
const createCategory = async (data) => {
  const body = {
    name: data.name,
    reference: data.reference,
    parent_id: data.parent_id ?? null,
  };
  const response = await axios.post(`${BASE_URL}/categories`, body, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * PUT /categories/:id
 * @param {number|string} id
 * @param {Object} data - { name, reference, is_active?, parent_id? }
 */
const updateCategory = async (id, data) => {
  const body = {
    name: data.name,
    reference: data.reference,
    ...(data.is_active !== undefined && { is_active: data.is_active }),
    parent_id: data.parent_id ?? null,
  };
  const response = await axios.put(`${BASE_URL}/categories/${id}`, body, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * DELETE /categories/:id
 * @param {number|string} id
 */
const deleteCategory = async (id) => {
  const response = await axios.delete(`${BASE_URL}/categories/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * PATCH /categories/:id/toggle
 * @param {number|string} id
 */
const toggleCategory = async (id) => {
  const response = await axios.patch(
    `${BASE_URL}/categories/${id}/toggle`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export { getCategories, createCategory, updateCategory, deleteCategory, toggleCategory };
