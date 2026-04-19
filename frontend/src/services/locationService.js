import axiosInstance from './axiosInstance';

export const getLocations = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.name) params.append('name', filters.name);
  if (filters.type) params.append('type', filters.type);
  if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
    params.append('is_active', filters.is_active);
  }
  
  const response = await axiosInstance.get(`/inventory?${params.toString()}`);
  return response.data;
};

export const createLocation = async (data) => {
  const response = await axiosInstance.post('/inventory', data);
  return response.data;
};

export const updateLocation = async (id, data) => {
  const response = await axiosInstance.put(`/inventory/${id}`, data);
  return response.data;
};

export const toggleLocation = async (id) => {
  const response = await axiosInstance.patch(`/inventory/${id}/toggle`);
  return response.data;
};
