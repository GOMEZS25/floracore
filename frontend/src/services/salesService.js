import axiosInstance from './axiosInstance';

const salesService = {
  listarOrdenes: async (params) => {
    const response = await axiosInstance.get('/sales/orders', { params });
    return response.data;
  },

  crearOrden: async (data) => {
    const response = await axiosInstance.post('/sales/orders', data);
    return response.data;
  },

  obtenerOrden: async (id) => {
    const response = await axiosInstance.get(`/sales/orders/${id}`);
    return response.data;
  },

  aprobarOrden: async (id) => {
    const response = await axiosInstance.patch(`/sales/orders/${id}/approve`);
    return response.data;
  },

  despacharOrden: async (id) => {
    const response = await axiosInstance.patch(`/sales/orders/${id}/dispatch`);
    return response.data;
  },

  cancelarOrden: async (id) => {
    const response = await axiosInstance.patch(`/sales/orders/${id}/cancel`);
    return response.data;
  },

  getNextOrderNumber: async () => {
    const response = await axiosInstance.get('/sales/orders/next-number');
    return response.data;
  },

  getTransactionCategories: async () => {
    const response = await axiosInstance.get('/sales/categories');
    return response.data;
  },

  actualizarHeader: async (id, data) => {
    const response = await axiosInstance.patch(`/sales/orders/${id}/update-header`, data);
    return response.data;
  },

  autoGuardarOrden: async (data) => {
    const response = await axiosInstance.post('/sales/orders/auto-save', data);
    return response.data;
  },

  agregarLinea: async (orderId, data) => {
    const response = await axiosInstance.post(`/sales/orders/${orderId}/details`, data);
    return response.data;
  },

  eliminarLinea: async (detailId) => {
    const response = await axiosInstance.delete(`/sales/orders/details/${detailId}`);
    return response.data;
  }
};

export default salesService;
