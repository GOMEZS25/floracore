import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

/**
 * GET /attributes?name=&is_active=
 * @param {Object} filters - { name, is_active }
 */
const getAttributes = async (filters = {}) => {
  const params = {};
  if (filters.name) params.name = filters.name;
  if (filters.is_active !== undefined && filters.is_active !== '')
    params.is_active = filters.is_active;

  const response = await axios.get(`${BASE_URL}/attributes`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

/**
 * POST /attributes
 * @param {Object} data - { name }
 */
const createAttribute = async (data) => {
  const response = await axios.post(`${BASE_URL}/attributes`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * PATCH /attributes/:id
 * @param {string} id
 * @param {Object} data - { name }
 */
const updateAttribute = async (id, data) => {
  const response = await axios.patch(`${BASE_URL}/attributes/${id}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * PATCH /attributes/:id/toggle
 * @param {string} id
 */
const toggleAttribute = async (id) => {
  const response = await axios.patch(
    `${BASE_URL}/attributes/${id}/toggle`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * GET /attributes/:id/values
 * @param {string} attributeId
 */
const getAttributeValues = async (attributeId) => {
  const response = await axios.get(`${BASE_URL}/attributes/${attributeId}/values`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * POST /attributes/:id/values
 * @param {string} attributeId
 * @param {Object} data - { value }
 */
const createAttributeValue = async (attributeId, data) => {
  const response = await axios.post(
    `${BASE_URL}/attributes/${attributeId}/values`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * PATCH /attributes/:id/values/:valueId/toggle
 * @param {string} attributeId
 * @param {string} valueId
 */
const toggleAttributeValue = async (attributeId, valueId) => {
  const response = await axios.patch(
    `${BASE_URL}/attributes/${attributeId}/values/${valueId}/toggle`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

/**
 * DELETE /attributes/:id/values/:valueId
 * @param {string} attributeId
 * @param {string} valueId
 */
const deleteAttributeValue = async (attributeId, valueId) => {
  const response = await axios.delete(
    `${BASE_URL}/attributes/${attributeId}/values/${valueId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export {
  getAttributes,
  createAttribute,
  updateAttribute,
  toggleAttribute,
  getAttributeValues,
  createAttributeValue,
  toggleAttributeValue,
  deleteAttributeValue,
};
