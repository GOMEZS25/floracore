import axiosInstance from './axiosInstance';

const lotService = {
  getLots: async (filters) => {
    const response = await axiosInstance.get('/lot', { params: filters });
    return response.data;
  },

  createLot: async (data) => {
    const response = await axiosInstance.post('/lot', data);
    return response.data;
  },

  updateLot: async (id, data) => {
    const response = await axiosInstance.put(`/lot/${id}`, data);
    return response.data;
  },

  deleteLot: async (id) => {
    const response = await axiosInstance.delete(`/lot/${id}`);
    return response.data;
  },

  addQuantity: async (id, cantidad) => {
    const response = await axiosInstance.patch(`/lot/${id}/add`, { cantidad });
    return response.data;
  },

  getCompanySettings: async () => {
    const response = await axiosInstance.get('/settings/company');
    return response.data;
  },

  getAllVariants: async () => {
    const response = await axiosInstance.get('/products/variants/all');
    return response.data;
  },

  getLocations: async (filters) => {
    const response = await axiosInstance.get('/inventory', { params: filters });
    return response.data;
  }
};

export default lotService;
