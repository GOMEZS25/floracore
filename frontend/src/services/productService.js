import axiosInstance from './axiosInstance';

const getProducts = async (filters = {}) => {
  const params = {};
  if (filters.name) params.name = filters.name;
  if (filters.sku) params.sku = filters.sku;
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.unit_of_measure) params.unit_of_measure = filters.unit_of_measure;
  if (filters.is_active !== undefined && filters.is_active !== '')
    params.is_active = filters.is_active;

  const response = await axiosInstance.get('/products', { params });
  return response.data;
};

const createProduct = async (data) => {
  const response = await axiosInstance.post('/products', data);
  return response.data;
};

const updateProduct = async (id, data) => {
  const response = await axiosInstance.patch(`/products/${id}`, data);
  return response.data;
};

const toggleProduct = async (id) => {
  const response = await axiosInstance.patch(`/products/${id}/toggle`, {});
  return response.data;
};

const generateVariants = async (productId, value_ids) => {
  const response = await axiosInstance.post(
    `/products/${productId}/variants/generate`,
    { value_ids }
  );
  return response.data;
};

const getVariants = async (productId) => {
  const response = await axiosInstance.get(`/products/${productId}/variants`);
  return response.data;
};

const toggleVariant = async (productId, variantId) => {
  const response = await axiosInstance.patch(
    `/products/${productId}/variants/${variantId}/toggle`,
    {}
  );
  return response.data;
};

const deleteVariant = async (productId, variantId) => {
  const response = await axiosInstance.delete(
    `/products/${productId}/variants/${variantId}`
  );
  return response.data;
};

const deleteProduct = async (id) => {
  const response = await axiosInstance.delete(`/products/${id}`);
  return response.data;
};

const getPackaging = async () => {
  const response = await axiosInstance.get('/packaging');
  return response.data;
};

export {
  getProducts,
  createProduct,
  updateProduct,
  toggleProduct,
  generateVariants,
  getVariants,
  toggleVariant,
  deleteVariant,
  deleteProduct,
  getPackaging,
};
