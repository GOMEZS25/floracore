import axiosInstance from './axiosInstance';

// Solo se cachea cuando se piden atributos activos sin filtro de nombre;
// se invalida con force=true o al mutar cualquier atributo/valor.
let _attributesCache = null;

const getAttributes = async (filters = {}, force = false) => {
  const isSimpleActiveQuery =
    !filters.name &&
    (filters.is_active === 'true' || filters.is_active === true);

  if (isSimpleActiveQuery && !force && _attributesCache !== null) {
    return _attributesCache;
  }

  const params = {};
  if (filters.name) params.name = filters.name;
  if (filters.is_active !== undefined && filters.is_active !== '')
    params.is_active = filters.is_active;

  const response = await axiosInstance.get('/attributes', { params });

  if (isSimpleActiveQuery) {
    _attributesCache = response.data;
  }

  return response.data;
};

const invalidateAttributesCache = () => {
  _attributesCache = null;
};

const createAttribute = async (data) => {
  invalidateAttributesCache();
  const response = await axiosInstance.post('/attributes', data);
  return response.data;
};

const updateAttribute = async (id, data) => {
  invalidateAttributesCache();
  const response = await axiosInstance.patch(`/attributes/${id}`, data);
  return response.data;
};

const updateAttributeOrder = async (id, order) => {
  invalidateAttributesCache();
  const response = await axiosInstance.patch(`/attributes/${id}`, { order });
  return response.data;
};

const toggleAttribute = async (id) => {
  invalidateAttributesCache();
  const response = await axiosInstance.patch(`/attributes/${id}/toggle`, {});
  return response.data;
};

const getAttributeValues = async (attributeId) => {
  const response = await axiosInstance.get(`/attributes/${attributeId}/values`);
  return response.data;
};

const createAttributeValue = async (attributeId, data) => {
  invalidateAttributesCache();
  const response = await axiosInstance.post(
    `/attributes/${attributeId}/values`,
    data
  );
  return response.data;
};

const toggleAttributeValue = async (attributeId, valueId) => {
  invalidateAttributesCache();
  const response = await axiosInstance.patch(
    `/attributes/${attributeId}/values/${valueId}/toggle`,
    {}
  );
  return response.data;
};

const deleteAttributeValue = async (attributeId, valueId) => {
  invalidateAttributesCache();
  const response = await axiosInstance.delete(
    `/attributes/${attributeId}/values/${valueId}`
  );
  return response.data;
};

export {
  getAttributes,
  invalidateAttributesCache,
  createAttribute,
  updateAttribute,
  updateAttributeOrder,
  toggleAttribute,
  getAttributeValues,
  createAttributeValue,
  toggleAttributeValue,
  deleteAttributeValue,
};
