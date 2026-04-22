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
  }
};

export default salesService;
